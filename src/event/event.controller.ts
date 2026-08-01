import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // POST /events — create a new event (any authenticated user)
  @UseGuards(AuthGuard)
  @Post()
  createEvent(@Body() dto: CreateEventDto, @Request() req: any) {
    const userId = req.user.sub as string;
    return this.eventService.createEvent(dto, userId);
  }
}
