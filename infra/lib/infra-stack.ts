import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. VPC - Single AZ, NO NAT
    const vpc = new ec2.Vpc(this, 'TattVpc', {
      maxAzs: 1,
      natGateways: 0,  // ← NO NAT! Save $16/month
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // 2. Database Secret
    const dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 16,
      },
    });

    // 3. RDS Database - PRIVATE subnet
    const database = new rds.DatabaseInstance(this, 'TattDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({ 
        version: rds.PostgresEngineVersion.VER_16 
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE4_GRAVITON, 
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetGroupName: 'Private' },
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: 'tatt_db',
      backupRetention: Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: false,  // ← NO public access!
      storageEncrypted: true,
      allocatedStorage: 20,
    });

    // 4. ECR Repositories
    const backendRepo = new ecr.Repository(this, 'BackendRepo', { 
      repositoryName: 'tatt-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const frontendRepo = new ecr.Repository(this, 'FrontendRepo', { 
      repositoryName: 'tatt-frontend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 5. ECS Cluster
    const cluster = new ecs.Cluster(this, 'TattCluster', { 
      vpc,
      containerInsights: true,
    });

    // 6. Security Groups
    const backendSg = new ec2.SecurityGroup(this, 'BackendSg', {
      vpc,
      description: 'Backend Security Group',
      allowAllOutbound: true,
    });
    backendSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'From ALB');

    const frontendSg = new ec2.SecurityGroup(this, 'FrontendSg', {
      vpc,
      description: 'Frontend Security Group',
      allowAllOutbound: true,
    });
    frontendSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'From ALB');

    const rdsSg = new ec2.SecurityGroup(this, 'RdsSg', {
      vpc,
      description: 'RDS Security Group',
      allowAllOutbound: true,
    });
    rdsSg.addIngressRule(backendSg, ec2.Port.tcp(5432), 'From Backend');

    // 7. Backend Service (Public Subnet, Public IP)
    const backend = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      serviceName: 'BackendService',
      securityGroups: [backendSg],
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(backendRepo),
        containerName: 'backend',
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          PORT: '3000',
          DB_HOST: database.instanceEndpoint.hostname,
          DB_PORT: database.instanceEndpoint.port.toString(),
          DB_NAME: 'tatt_db',
          JWT_SECRET: 'change_me_in_production',
        },
        secrets: {
          DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
          DB_PASS: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'backend',
          logGroup: new logs.LogGroup(this, 'BackendLogGroup', {
            logGroupName: '/ecs/tatt-backend',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        }),
      },
      publicLoadBalancer: true,
      assignPublicIp: true,  // ← Public IP for internet access
      desiredCount: 1,
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // 8. Frontend Service (Public Subnet, Public IP)
    const frontend = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FrontendService', {
      cluster,
      serviceName: 'FrontendService',
      securityGroups: [frontendSg],
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(frontendRepo),
        containerName: 'frontend',
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          NEXT_PUBLIC_API_URL: `http://${backend.loadBalancer.loadBalancerDnsName}/api`,
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'frontend',
          logGroup: new logs.LogGroup(this, 'FrontendLogGroup', {
            logGroupName: '/ecs/tatt-frontend',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        }),
      },
      publicLoadBalancer: true,
      assignPublicIp: true,  // ← Public IP for internet access
      desiredCount: 1,
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // 9. Allow Backend to connect to RDS
    database.connections.allowFrom(backend.service, ec2.Port.tcp(5432));

    // 10. Outputs
    new cdk.CfnOutput(this, 'FrontendUrl', { 
      value: `http://${frontend.loadBalancer.loadBalancerDnsName}`,
    });
    new cdk.CfnOutput(this, 'BackendUrl', { 
      value: `http://${backend.loadBalancer.loadBalancerDnsName}`,
    });
    new cdk.CfnOutput(this, 'DatabaseEndpoint', { 
      value: database.instanceEndpoint.hostname,
    });
    new cdk.CfnOutput(this, 'BackendRepository', { 
      value: backendRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, 'FrontendRepository', { 
      value: frontendRepo.repositoryUri,
    });
  }
}