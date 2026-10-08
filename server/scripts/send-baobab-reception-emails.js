const path = require('path');
const fs = require('fs');

// Native Node.js 20+ env loader for local runs outside Docker
if (typeof process.loadEnvFile === 'function') {
  const candidateEnvFiles = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
  ];
  for (const file of candidateEnvFiles) {
    if (fs.existsSync(file)) {
      try { process.loadEnvFile(file); } catch (_) {}
    }
  }
}

// Fallback defaults for safety
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_dummy_fallback_key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';
process.env.APP_SECRET = process.env.APP_SECRET || 'dev-app-secret-12345';

// Resolve compiled dist base directory (handles both local and docker container paths)
const distBase = fs.existsSync(path.resolve(__dirname, '../dist/app.module.js'))
  ? path.resolve(__dirname, '../dist')
  : fs.existsSync(path.resolve(__dirname, '../dist/src/app.module.js'))
  ? path.resolve(__dirname, '../dist/src')
  : path.resolve(__dirname, '../src');

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require(path.join(distBase, 'app.module'));
const { User } = require(path.join(distBase, 'modules/iam/entities/user.entity'));
const { Notification, NotificationType } = require(path.join(distBase, 'modules/notifications/entities/notification.entity'));
const { CommunityTier } = require(path.join(distBase, 'modules/iam/enums/roles.enum'));
const { MailService } = require(path.join(distBase, 'common/mail/mail.service'));
const {
  generateBaobabEmailHtml,
  generateBaobabEmailText,
} = require(path.join(distBase, 'common/mail/templates/baobab-reception-email.template'));
const { Resend } = require('resend');
const { Op } = require('sequelize');

const TIER_CONFIGS = {
  [CommunityTier.UBUNTU]: {
    displayName: 'Ubuntu',
    discountPercent: 15,
    promoCode: '2026BAOBAB15',
    eventbriteUrl: 'https://www.eventbrite.com/e/the-baobab-reception-2026-tickets-1999976225729?discount=2026BAOBAB15&aff=foundernote',
  },
  [CommunityTier.IMANI]: {
    displayName: 'Imani',
    discountPercent: 25,
    promoCode: '2026BAOBAB25',
    eventbriteUrl: 'https://www.eventbrite.com/e/the-baobab-reception-2026-tickets-1999976225729?discount=2026BAOBAB25&aff=foundernote',
  },
  [CommunityTier.KIONGOZI]: {
    displayName: 'Kiongozi',
    discountPercent: 25,
    promoCode: '2026BAOBAB25',
    eventbriteUrl: 'https://www.eventbrite.com/e/the-baobab-reception-2026-tickets-1999976225729?discount=2026BAOBAB25&aff=foundernote',
  },
};

const ELIGIBLE_TIERS = [CommunityTier.UBUNTU, CommunityTier.IMANI, CommunityTier.KIONGOZI];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const isDryRun = args.includes('--dry-run');
  const isSend = args.includes('--send');
  const testEmailArg = args.find((a) => a.startsWith('--test'));

  let testEmail;
  if (testEmailArg) {
    if (testEmailArg.includes('=')) {
      testEmail = testEmailArg.split('=')[1];
    } else {
      const idx = args.indexOf(testEmailArg);
      testEmail = args[idx + 1];
    }
  }

  // -------------------------------------------------------------
  // MODE 0: INSTANT HTML PREVIEW (NO DB REQUIRED)
  // -------------------------------------------------------------
  if (isPreview) {
    const previewsDir = path.join(__dirname, 'previews');
    if (!fs.existsSync(previewsDir)) {
      fs.mkdirSync(previewsDir, { recursive: true });
    }

    const ubuntuHtml = generateBaobabEmailHtml({
      recipientName: 'Kofi',
      tierName: 'Ubuntu',
      discountPercent: 15,
      promoCode: '2026BAOBAB15',
      eventbriteUrl: TIER_CONFIGS[CommunityTier.UBUNTU].eventbriteUrl,
    });
    const imaniHtml = generateBaobabEmailHtml({
      recipientName: 'Amara',
      tierName: 'Imani',
      discountPercent: 25,
      promoCode: '2026BAOBAB25',
      eventbriteUrl: TIER_CONFIGS[CommunityTier.IMANI].eventbriteUrl,
    });
    const kiongoziHtml = generateBaobabEmailHtml({
      recipientName: 'Kwame',
      tierName: 'Kiongozi',
      discountPercent: 25,
      promoCode: '2026BAOBAB25',
      eventbriteUrl: TIER_CONFIGS[CommunityTier.KIONGOZI].eventbriteUrl,
    });

    const ubuntuPreviewPath = path.join(previewsDir, 'preview-ubuntu.html');
    const imaniPreviewPath = path.join(previewsDir, 'preview-imani.html');
    const kiongoziPreviewPath = path.join(previewsDir, 'preview-kiongozi.html');

    fs.writeFileSync(ubuntuPreviewPath, ubuntuHtml, 'utf8');
    fs.writeFileSync(imaniPreviewPath, imaniHtml, 'utf8');
    fs.writeFileSync(kiongoziPreviewPath, kiongoziHtml, 'utf8');

    console.log('\n📄 Generated visual HTML preview files:');
    console.log(`  • file://${ubuntuPreviewPath}`);
    console.log(`  • file://${imaniPreviewPath}`);
    console.log(`  • file://${kiongoziPreviewPath}`);
    console.log('\nYou can open these files directly in your web browser to view the design.\n');
    process.exit(0);
  }

  if (!isDryRun && !isSend && !testEmail) {
    console.log(`
=============================================================================
  TATT Baobab Reception Promo Code Email Dispatcher
=============================================================================

Usage:
  node scripts/send-baobab-reception-emails.js [MODE]

Available Modes:
  --preview             Instantly generate HTML preview files (no database needed)
  --dry-run             Preview eligible members and verify counts in database without sending
  --test <email>        Send sample preview emails to a specific test email
  --send                Execute live delivery to all active paid members & create portal notifications

Examples:
  node scripts/send-baobab-reception-emails.js --preview
  node scripts/send-baobab-reception-emails.js --dry-run
  node scripts/send-baobab-reception-emails.js --test admin@theafricanthinktank.com
  node scripts/send-baobab-reception-emails.js --send
=============================================================================
    `);
    process.exit(0);
  }

  // -------------------------------------------------------------
  // MODE 1: TEST EMAIL TO SINGLE ADDRESS (NO DB REQUIRED)
  // -------------------------------------------------------------
  if (testEmail) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_dummy_fallback_key') {
      console.error('\n❌ RESEND_API_KEY is not configured or is a placeholder.');
      console.error('To send a test email, ensure RESEND_API_KEY is defined in your environment:');
      console.error(`  RESEND_API_KEY=re_your_key node scripts/send-baobab-reception-emails.js --test ${testEmail}\n`);
      process.exit(1);
    }

    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'The African Think Tank <noreply@theafricanthinktank.com>';

    console.log(`\n📨 Sending TEST preview emails to: ${testEmail}`);
    console.log(`   From: ${fromAddress}`);

    // 1. Ubuntu test (15%)
    const ubuntuParams = {
      recipientName: 'Test Member',
      tierName: TIER_CONFIGS[CommunityTier.UBUNTU].displayName,
      discountPercent: TIER_CONFIGS[CommunityTier.UBUNTU].discountPercent,
      promoCode: TIER_CONFIGS[CommunityTier.UBUNTU].promoCode,
      eventbriteUrl: TIER_CONFIGS[CommunityTier.UBUNTU].eventbriteUrl,
    };
    console.log(`  -> Sending Ubuntu (15% - ${ubuntuParams.promoCode}) test...`);
    try {
      await resend.emails.send({
        from: fromAddress,
        to: testEmail,
        subject: `Exclusive Invitation: The Baobab Reception • 15% Member Discount`,
        html: generateBaobabEmailHtml(ubuntuParams),
        text: generateBaobabEmailText(ubuntuParams),
      });
      console.log(`     ✅ Sent Ubuntu test email successfully.`);
    } catch (err) {
      console.error(`     ❌ Failed to send Ubuntu test email: ${err.message}`);
    }

    await sleep(500);

    // 2. Imani/Kiongozi test (25%)
    const imaniParams = {
      recipientName: 'Test Member',
      tierName: TIER_CONFIGS[CommunityTier.IMANI].displayName,
      discountPercent: TIER_CONFIGS[CommunityTier.IMANI].discountPercent,
      promoCode: TIER_CONFIGS[CommunityTier.IMANI].promoCode,
      eventbriteUrl: TIER_CONFIGS[CommunityTier.IMANI].eventbriteUrl,
    };
    console.log(`  -> Sending Imani/Kiongozi (25% - ${imaniParams.promoCode}) test...`);
    try {
      await resend.emails.send({
        from: fromAddress,
        to: testEmail,
        subject: `Exclusive Invitation: The Baobab Reception • 25% Member Discount`,
        html: generateBaobabEmailHtml(imaniParams),
        text: generateBaobabEmailText(imaniParams),
      });
      console.log(`     ✅ Sent Imani test email successfully.`);
    } catch (err) {
      console.error(`     ❌ Failed to send Imani test email: ${err.message}`);
    }

    console.log('\n🎉 Test emails dispatched. Check the inbox and spam folder of:', testEmail);
    process.exit(0);
  }

  // -------------------------------------------------------------
  // BOOTSTRAP NEST APPLICATION CONTEXT FOR DATABASE MODES
  // -------------------------------------------------------------
  console.log('\n🚀 Initializing TATT Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const mailService = app.get(MailService);

  // -------------------------------------------------------------
  // QUERY RECIPIENTS FROM DATABASE
  // -------------------------------------------------------------
  console.log('🔍 Querying member database...');

  const [activePaidMembers, freeMembersCount, inactiveMembersCount] = await Promise.all([
    User.findAll({
      where: {
        isActive: true,
        communityTier: {
          [Op.in]: ELIGIBLE_TIERS,
        },
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'communityTier'],
      order: [['communityTier', 'ASC'], ['lastName', 'ASC']],
    }),
    User.count({
      where: {
        communityTier: CommunityTier.FREE,
      },
    }),
    User.count({
      where: {
        isActive: false,
      },
    }),
  ]);

  // Breakdown by tier
  const ubuntuMembers = activePaidMembers.filter((u) => u.communityTier === CommunityTier.UBUNTU);
  const imaniMembers = activePaidMembers.filter((u) => u.communityTier === CommunityTier.IMANI);
  const kiongoziMembers = activePaidMembers.filter((u) => u.communityTier === CommunityTier.KIONGOZI);

  console.log('\n=============================================================================');
  console.log('📊 AUDIENCE ANALYSIS SUMMARY');
  console.log('=============================================================================');
  console.log(`  Total Active Paid Recipients:   ${activePaidMembers.length}`);
  console.log(`    • Ubuntu Members (15% off):   ${ubuntuMembers.length}`);
  console.log(`    • Imani Members (25% off):    ${imaniMembers.length}`);
  console.log(`    • Kiongozi Members (25% off): ${kiongoziMembers.length}`);
  console.log('-----------------------------------------------------------------------------');
  console.log(`  Excluded Free Sankofa Members:  ${freeMembersCount}`);
  console.log(`  Excluded Inactive Users:        ${inactiveMembersCount}`);
  console.log('=============================================================================\n');

  // -------------------------------------------------------------
  // MODE 2: DRY-RUN PREVIEW
  // -------------------------------------------------------------
  if (isDryRun) {
    console.log('🔎 DRY RUN MODE ACTIVE - No emails will be sent.\n');

    if (activePaidMembers.length > 0) {
      console.log('Sample Recipients:');
      activePaidMembers.slice(0, 10).forEach((u, i) => {
        const config = TIER_CONFIGS[u.communityTier];
        console.log(
          `  ${i + 1}. [${config?.displayName || u.communityTier}] ${u.firstName || ''} ${u.lastName || ''} <${u.email}> -> Promo: ${config?.promoCode}`
        );
      });
      if (activePaidMembers.length > 10) {
        console.log(`  ... and ${activePaidMembers.length - 10} more members.`);
      }
    } else {
      console.log('ℹ️  No active paid members currently found in the connected database.');
    }

    console.log('\n💡 To send a live test to your email:');
    console.log('   node scripts/send-baobab-reception-emails.js --test your-email@example.com\n');

    await app.close();
    process.exit(0);
  }

  // -------------------------------------------------------------
  // MODE 3: LIVE DISPATCH
  // -------------------------------------------------------------
  if (isSend) {
    if (activePaidMembers.length === 0) {
      console.log('⚠️  No active paid members found to dispatch emails to. Exiting.');
      await app.close();
      process.exit(0);
    }

    console.log(`🚨 LIVE DISPATCH INITIATED FOR ${activePaidMembers.length} MEMBERS`);
    console.log('-----------------------------------------------------------------------------');

    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < activePaidMembers.length; i++) {
      const member = activePaidMembers[i];
      const config = TIER_CONFIGS[member.communityTier];

      if (!config) {
        console.warn(`[${i + 1}/${activePaidMembers.length}] Skipping user ${member.email} - unknown tier ${member.communityTier}`);
        continue;
      }

      const params = {
        recipientName: member.firstName || 'Member',
        tierName: config.displayName,
        discountPercent: config.discountPercent,
        promoCode: config.promoCode,
        eventbriteUrl: config.eventbriteUrl,
      };

      try {
        // 1. Send personalized email
        await mailService.sendBaobabInvitationEmail(member.email, params);

        // 2. Create in-app portal notification
        await Notification.create({
          userId: member.id,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: `🎟️ Baobab Reception Member Discount (${config.promoCode})`,
          message: `As an active ${config.displayName} member, enjoy ${config.discountPercent}% off your ticket to The Baobab Reception (Nov 14, 2026) using promo code ${config.promoCode} on Eventbrite.`,
          isEmailSent: true,
        });

        successCount++;
        console.log(`[${i + 1}/${activePaidMembers.length}] ✅ Dispatched to ${member.email} (${config.displayName})`);
      } catch (err) {
        failCount++;
        console.error(`[${i + 1}/${activePaidMembers.length}] ❌ Failed for ${member.email}: ${err.message}`);
      }

      // 100ms pause between sends to be gentle with rate limits
      await sleep(100);
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n=============================================================================');
    console.log('🏁 DISPATCH COMPLETED');
    console.log('=============================================================================');
    console.log(`  Successful Deliveries: ${successCount}`);
    console.log(`  Failed Deliveries:     ${failCount}`);
    console.log(`  Total Elapsed Time:    ${elapsedSec}s`);
    console.log('=============================================================================\n');

    await app.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error in script:', err);
  process.exit(1);
});
