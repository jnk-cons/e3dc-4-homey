import {SummaryType} from '../model/summary.config';
import {Driver} from 'homey';

export function getTypeName(summaryType: SummaryType, homey: Driver.Homey): string {
    switch (summaryType) {
        case SummaryType.YESTERDAY:
            return homey.__('area.YESTERDAY')
        case SummaryType.TODAY:
            return homey.__('area.TODAY')
        case SummaryType.LAST_MONTH:
            return homey.__('area.LAST_MONTH')
        case SummaryType.CURRENT_MONTH:
            return homey.__('area.CURRENT_MONTH')
        case SummaryType.LAST_YEAR:
            return homey.__('area.LAST_YEAR')
        case SummaryType.CURRENT_YEAR:
            return homey.__('area.CURRENT_YEAR')
    }
    return 'UNKNOWN'
}
