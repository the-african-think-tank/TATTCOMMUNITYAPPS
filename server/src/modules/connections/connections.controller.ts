import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiResponse,
    ApiExtraModels,
    ApiQuery,
    getSchemaPath,
} from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { RecommenderService } from './recommender.service';
import {
    SendConnectionRequestDto,
    RespondToConnectionDto,
    NetworkConnectionSchema,
    IncomingRequestSchema,
    SentRequestSchema,
    ConnectionStatusSchema,
    ConnectionMessageResponseSchema,
} from './dto/connection.dto';
import {
    RecommendationsQueryDto,
    RecommendationSchema,
} from './dto/recommendations.dto';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';

@ApiTags('Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(
    NetworkConnectionSchema,
    IncomingRequestSchema,
    SentRequestSchema,
    ConnectionStatusSchema,
    ConnectionMessageResponseSchema,
    RecommendationSchema,
)
@Controller('connections')
export class ConnectionsController {
    constructor(
        private readonly connectionsService: ConnectionsService,
        private readonly recommenderService: RecommenderService,
    ) { }

    // ─── SEND A CONNECTION REQUEST ───────────────────────────────────────────────

    @ApiOperation({
        summary: 'Send a connection request',
        description:
            '**Paid members only (Ubuntu, Imani, Kiongozi tier).** ' +
            'A personalised message between 1 and 500 characters is required. ' +
            'The recipient will be notified by email and can review the request and the sender\'s profile before deciding. ' +
            'Duplicate or conflicting requests are rejected automatically.',
    })
    @ApiBody({ type: SendConnectionRequestDto })
    @ApiResponse({
        status: 201,
        description: 'Connection request sent successfully.',
        type: ConnectionMessageResponseSchema,
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request — e.g. trying to connect to yourself, or validation failure on the message.',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorised — JWT token missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden — only paid members (Ubuntu / Imani / Kiongozi tier) can send connection requests.',
    })
    @ApiResponse({
        status: 404,
        description: 'Not found — the target member does not exist or their account is inactive.',
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict — a pending request or active connection between these two members already exists.',
    })
    @Post('request')
    @HttpCode(HttpStatus.CREATED)
    async sendRequest(@Request() req, @Body() dto: SendConnectionRequestDto) {
        return this.connectionsService.sendRequest(req.user, dto);
    }

    // ─── RESPOND TO A CONNECTION REQUEST ────────────────────────────────────────

    @ApiOperation({
        summary: 'Accept or decline a connection request',
        description:
            'Only the **recipient** of the request may respond. ' +
            'Once accepted, both members appear in each other\'s network. ' +
            'A declined request can be re-sent by the original requester after the other side has declined.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID of the connection request to respond to',
        example: 'a1b2c3d4-eeee-ffff-0000-111122223333',
        format: 'uuid',
    })
    @ApiBody({ type: RespondToConnectionDto })
    @ApiResponse({
        status: 200,
        description: 'Request accepted or declined successfully.',
        type: ConnectionMessageResponseSchema,
    })
    @ApiResponse({ status: 400, description: 'Request is no longer in PENDING status and cannot be updated.' })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden — you are not the recipient of this request.' })
    @ApiResponse({ status: 404, description: 'Connection request not found.' })
    @Patch('request/:id/respond')
    @HttpCode(HttpStatus.OK)
    async respondToRequest(
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RespondToConnectionDto,
    ) {
        return this.connectionsService.respondToRequest(req.user, id, dto);
    }

    // ─── WITHDRAW A SENT REQUEST ─────────────────────────────────────────────────

    @ApiOperation({
        summary: 'Withdraw a pending connection request you sent',
        description:
            'Marks a PENDING outbound request as WITHDRAWN. ' +
            'Only the original **requester** can withdraw. ' +
            'Already accepted or declined requests cannot be withdrawn.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID of the connection request to withdraw',
        example: 'a1b2c3d4-eeee-ffff-0000-111122223333',
        format: 'uuid',
    })
    @ApiResponse({ status: 200, description: 'Connection request withdrawn.', type: ConnectionMessageResponseSchema })
    @ApiResponse({ status: 400, description: 'Request is not in a PENDING state and cannot be withdrawn.' })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden — you did not send this request.' })
    @ApiResponse({ status: 404, description: 'Connection request not found.' })
    @Patch('request/:id/withdraw')
    @HttpCode(HttpStatus.OK)
    async withdrawRequest(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
        return this.connectionsService.withdrawRequest(req.user, id);
    }

    // ─── REMOVE / DISCONNECT ──────────────────────────────────────────────────────

    @ApiOperation({
        summary: 'Remove an accepted connection (disconnect)',
        description:
            'Permanently removes an ACCEPTED connection. ' +
            'Either party in the connection may trigger this. ' +
            'Both users will be removed from each other\'s network immediately.',
    })
    @ApiParam({
        name: 'id',
        description: 'UUID of the accepted connection to remove',
        example: 'c3d4e5f6-0001-4444-aaaa-bbbbccccdddd',
        format: 'uuid',
    })
    @ApiResponse({ status: 200, description: 'Connection removed successfully.', type: ConnectionMessageResponseSchema })
    @ApiResponse({ status: 400, description: 'Connection is not in ACCEPTED status.' })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @ApiResponse({ status: 403, description: 'Forbidden — you are not part of this connection.' })
    @ApiResponse({ status: 404, description: 'Connection not found.' })
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async removeConnection(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
        return this.connectionsService.removeConnection(req.user, id);
    }

    // ─── GET MY NETWORK ───────────────────────────────────────────────────────────

    @ApiOperation({
        summary: 'Get my full network',
        description:
            'Returns all members the authenticated user is currently connected with (status = ACCEPTED). ' +
            'The response is normalised so each item always shows the **other** person\'s profile, ' +
            'regardless of who initiated the connection.',
    })
    @ApiResponse({
        status: 200,
        description: 'Array of accepted connections with the connected member\'s profile.',
        schema: {
            type: 'array',
            items: { $ref: getSchemaPath(NetworkConnectionSchema) },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @Get('network')
    async getMyNetwork(@Request() req) {
        return this.connectionsService.getMyNetwork(req.user);
    }

    // ─── INCOMING REQUESTS ────────────────────────────────────────────────────────

    @ApiOperation({
        summary: 'Get incoming connection requests',
        description:
            'Returns all PENDING connection requests sent **to** the authenticated user. ' +
            'Each item includes the sender\'s profile and the personalised message they wrote.',
    })
    @ApiResponse({
        status: 200,
        description: 'Array of pending incoming connection requests.',
        schema: {
            type: 'array',
            items: { $ref: getSchemaPath(IncomingRequestSchema) },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @Get('requests/incoming')
    async getIncomingRequests(@Request() req) {
        return this.connectionsService.getIncomingRequests(req.user);
    }

    // ─── SENT REQUESTS ────────────────────────────────────────────────────────────

    @ApiOperation({
        summary: 'Get sent connection requests',
        description:
            'Returns all PENDING connection requests sent **by** the authenticated user that have not yet been responded to.',
    })
    @ApiResponse({
        status: 200,
        description: 'Array of pending outgoing connection requests.',
        schema: {
            type: 'array',
            items: { $ref: getSchemaPath(SentRequestSchema) },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @Get('requests/sent')
    async getSentRequests(@Request() req) {
        return this.connectionsService.getSentRequests(req.user);
    }

    // ─── CONNECTION STATUS WITH A SPECIFIC MEMBER ─────────────────────────────────

    @ApiOperation({
        summary: 'Check connection status with a specific member',
        description:
            'Returns the current relationship state between the authenticated user and the given member. ' +
            'Useful for rendering the correct action button on a member\'s profile page ' +
            '(e.g. "Connect", "Pending", "Connected", "Respond").',
    })
    @ApiParam({
        name: 'memberId',
        description: 'UUID of the member whose connection status you want to check',
        example: 'b2c9f1a0-4e8d-4f71-bf14-01e23f4a5678',
        format: 'uuid',
    })
    @ApiResponse({
        status: 200,
        description: 'Connection status, connection ID (if any), and who initiated the request.',
        type: ConnectionStatusSchema,
    })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @Get('status/:memberId')
    async getConnectionStatus(
        @Request() req,
        @Param('memberId', ParseUUIDPipe) memberId: string,
    ) {
        return this.connectionsService.getConnectionStatus(req.user, memberId);
    }

    // ─── TATT CONNECT RECOMMENDER ─────────────────────────────────────────────────

    @ApiOperation({
        summary: '✨ TATT Connect Recommender — get personalised connection suggestions',
        description:
            '**TATT Connect Recommender** analyses your professional interests, industry, and chapter ' +
            'to surface the members most likely to be valuable connections.\n\n' +
            '**Scoring algorithm** (higher = better match):\n' +
            '- `+25` per shared professional interest (cumulative)\n' +
            '- `+30` if the candidate is in the same industry\n' +
            '- `+20` if the candidate is in the same TATT chapter\n\n' +
            '**Example scores:**\n' +
            '- 3 shared interests + same industry + same chapter → **125 pts**\n' +
            '- 1 shared interest + same industry → **55 pts**\n' +
            '- 2 shared interests only → **50 pts**\n\n' +
            'Results are sorted descending by score. ' +
            'Already-connected and pending-request members are excluded automatically.\n\n' +
            '**Membership:** All members (including Free tier) receive recommendations. ' +
            'The `canConnect` flag on each result indicates whether the current user ' +
            'is allowed to submit a connection request (paid tiers only).',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Max results to return (1–50). Defaults to 20.',
        example: 20,
        type: Number,
    })
    @ApiResponse({
        status: 200,
        description: 'Ranked list of recommended members with match score breakdown.',
        schema: {
            type: 'array',
            items: { $ref: getSchemaPath(RecommendationSchema) },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Empty array when the current user has no professional interests set.',
    })
    @ApiResponse({ status: 401, description: 'Unauthorised — JWT token missing or invalid.' })
    @Get('recommend')
    async getRecommendations(@Request() req, @Query() query: RecommendationsQueryDto) {
        return this.recommenderService.getRecommendations(req.user, query.limit ?? 20);
    }
}
