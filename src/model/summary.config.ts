export interface SummaryConfig {
    stationId: string,
    type: SummaryType
}

export enum SummaryType {
    YESTERDAY,
    TODAY,
    LAST_MONTH,
    CURRENT_MONTH,
    LAST_YEAR,
    CURRENT_YEAR,
}
