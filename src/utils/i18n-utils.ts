import {SummaryType} from '../model/summary.config';
import {Driver} from 'homey';
import {ResultCode} from 'easy-rscp';

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

export function getResultCode(code: ResultCode, homey: Driver.Homey): string {
    switch (code) {
        case ResultCode.SUCCESS:
            return homey.__('result-code.SUCCESS')
        case ResultCode.AGAIN:
            return homey.__('result-code.AGAIN')
        case ResultCode.UNKNOWN:
            return homey.__('result-code.UNKNOWN')
        case ResultCode.FORMAT_ERROR:
            return homey.__('result-code.FORMAT_ERROR')
        case ResultCode.UNHANDLED:
            return homey.__('result-code.UNHANDLED')
        case ResultCode.ACCESS_DENIED:
            return homey.__('result-code.ACCESS_DENIED')
    }
    return 'UNKNOWN'
}
