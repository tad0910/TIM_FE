declare module 'react-big-calendar' {
  import { Component } from 'react';
  import { DateInput } from 'react-big-calendar';

  export interface CalendarProps {
    localizer: unknown;
    events?: unknown[];
    defaultView?: string;
    views?: string[];
    startAccessor?: string;
    endAccessor?: string;
    components?: Record<string, unknown>;
    style?: React.CSSProperties;
    messages?: Record<string, string>;
    popup?: boolean;
    min?: Date;
    max?: Date;
    step?: number;
    timeslots?: number;
    culture?: string;
    onSelectEvent?: (event: unknown) => void;
    date?: Date;
    onNavigate?: (date: Date) => void;
  }

  export class Calendar extends Component<CalendarProps> {}

  export enum Views {
    MONTH = 'month',
    WEEK = 'week',
    DAY = 'day',
    AGENDA = 'agenda',
  }

  export enum Navigate {
    PREVIOUS = 'PREV',
    NEXT = 'NEXT',
    TODAY = 'TODAY',
    DATE = 'DATE',
  }

  export function dateFnsLocalizer(config: {
    format: (date: Date, format: string, options?: unknown) => string;
    parse: (str: string) => Date;
    startOfWeek: () => Date;
    getDay: (date: Date) => number;
    locales: Record<string, unknown>;
  }): unknown;
}





