import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  // GET /events — public, no auth required
  @Get()
  listActiveEvents(
    @Query('category') category?: string,
    @Query('dateRange') dateRange?: string,
  ) {
    return this.eventService.listActiveEvents(category, dateRange);
  }

  // POST /events — create a new event (any authenticated user)
  @UseGuards(AuthGuard)
  @Post()
  createEvent(@Body() dto: CreateEventDto, @Request() req: any) {
    const userId = req.user.sub as string;
    return this.eventService.createEvent(dto, userId);
  }

  // GET /events/search?searchQuery=... — public, relevance-ranked search
  @Get('search')
  searchEventsByTitleOrCategory(@Query('searchQuery') searchQuery: string) {
    return this.eventService.searchEventsByTitleOrCategory(searchQuery);
  }

  // GET /events/:id — public, returns a single event by ID
  @Get(':id')
  getSingleEvent(@Param('id') id: string) {
    return this.eventService.getSingleEvent(id);
  }
}
