import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { JwtAuthGuard } from '../../modules/iam/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Events & Workshops')
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new event or workshop (Org Admin/Content Admin only)' })
    @ApiResponse({ status: 201, description: 'Event created successfully and notifications sent.' })
    async create(@Body() createEventDto: CreateEventDto, @Req() req: any) {
        return this.eventsService.createEvent(req.user, createEventDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an event or workshop' })
    async update(@Param('id') id: string, @Body() updateEventDto: CreateEventDto, @Req() req: any) {
        return this.eventsService.updateEvent(req.user, id, updateEventDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete an event or workshop' })
    async remove(@Param('id') id: string, @Req() req: any) {
        return this.eventsService.deleteEvent(req.user, id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all published events and workshops' })
    async findAll(
        @Req() req: any,
        @Query('upcoming') upcoming?: string,
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        return this.eventsService.getEvents(req.user, upcoming === 'true', limitNum);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get detailed information for a specific event' })
    async findOne(@Param('id') id: string) {
        return this.eventsService.getEvent(id);
    }

    @Post(':id/register')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register a community member or business for an event' })
    @ApiResponse({ status: 200, description: 'Registration successful. Returns checkoutUrl if payment is required.' })
    async register(@Param('id') id: string, @Body() registerDto: RegisterEventDto, @Req() req: any) {
        return this.eventsService.register(req.user, id, registerDto);
    }

    @Get(':id/attendees')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get list of completed registrations (attendees) for an event' })
    async getAttendees(@Param('id') id: string) {
        return this.eventsService.getEventAttendees(id);
    }
}
