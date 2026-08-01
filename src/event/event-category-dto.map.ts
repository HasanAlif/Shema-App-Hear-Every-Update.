import { EventCategory } from './event.types';

import { ChasunahDetailsDto } from './dto/category-details/chasunah-details.dto';
import { ShevaBrachosDetailsDto } from './dto/category-details/sheva-brachos-details.dto';
import { TenoyimDetailsDto } from './dto/category-details/tenoyim-details.dto';
import { BarMitzvahDetailsDto } from './dto/category-details/bar-mitzvah-details.dto';
import { VochNochtDetailsDto } from './dto/category-details/voch-nocht-details.dto';
import { BrisDetailsDto } from './dto/category-details/bris-details.dto';
import { ShidduchDetailsDto } from './dto/category-details/shidduch-details.dto';
import { NichumAveilimDetailsDto } from './dto/category-details/nichum-aveilim-details.dto';
import { ZocherDetailsDto } from './dto/category-details/zocher-details.dto';
import { KiddushDetailsDto } from './dto/category-details/kiddush-details.dto';
import { ZucherVochnochtDetailsDto } from './dto/category-details/zucher-vochnocht-details.dto';
import { BavarfenDetailsDto } from './dto/category-details/bavarfen-details.dto';
import { ShabbosShevaBrachosDetailsDto } from './dto/category-details/shabbos-sheva-brachos-details.dto';
import { PidyonHabenDetailsDto } from './dto/category-details/pidyon-haben-details.dto';

export type DetailsCtorType = new () => any;

/**
 * Single source of truth: EventCategory value → Details DTO class.
 * The service uses this map to pick the correct validator at runtime.
 */
export const EVENT_CATEGORY_DTO_MAP: Record<EventCategory, DetailsCtorType> = {
  [EventCategory.CHASUNAH]: ChasunahDetailsDto,
  [EventCategory.SHEVA_BRACHOS]: ShevaBrachosDetailsDto,
  [EventCategory.TENOYIM]: TenoyimDetailsDto,
  [EventCategory.BAR_MITZVAH]: BarMitzvahDetailsDto,
  [EventCategory.VOCH_NOCHT]: VochNochtDetailsDto,
  [EventCategory.BRIS]: BrisDetailsDto,
  [EventCategory.SHIDDUCH]: ShidduchDetailsDto,
  [EventCategory.NICHUM_AVEILIM]: NichumAveilimDetailsDto,
  [EventCategory.ZOCHER]: ZocherDetailsDto,
  [EventCategory.KIDDUSH]: KiddushDetailsDto,
  [EventCategory.ZUCHER_VOCHNOCHT]: ZucherVochnochtDetailsDto,
  [EventCategory.BAVARFEN]: BavarfenDetailsDto,
  [EventCategory.SHABBOS_SHEVA_BRACHOS]: ShabbosShevaBrachosDetailsDto,
  [EventCategory.PIDYON_HABEN]: PidyonHabenDetailsDto,
};
