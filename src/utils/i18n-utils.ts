import {SummaryType} from '../model/summary.config';
import {ResultCode} from 'easy-rscp';
import {I18n} from '../internal-api/i18n';

export function getTypeName(summaryType: SummaryType, t: I18n): string {
    switch (summaryType) {
        case SummaryType.YESTERDAY:
            return t.translate('area.YESTERDAY')
        case SummaryType.TODAY:
            return t.translate('area.TODAY')
        case SummaryType.LAST_MONTH:
            return t.translate('area.LAST_MONTH')
        case SummaryType.CURRENT_MONTH:
            return t.translate('area.CURRENT_MONTH')
        case SummaryType.LAST_YEAR:
            return t.translate('area.LAST_YEAR')
        case SummaryType.CURRENT_YEAR:
            return t.translate('area.CURRENT_YEAR')
    }
    return 'UNKNOWN'
}

export function getResultCode(code: ResultCode, t: I18n): string {
    switch (code) {
        case ResultCode.SUCCESS:
            return t.translate('result-code.SUCCESS')
        case ResultCode.AGAIN:
            return t.translate('result-code.AGAIN')
        case ResultCode.UNKNOWN:
            return t.translate('result-code.UNKNOWN')
        case ResultCode.FORMAT_ERROR:
            return t.translate('result-code.FORMAT_ERROR')
        case ResultCode.UNHANDLED:
            return t.translate('result-code.UNHANDLED')
        case ResultCode.ACCESS_DENIED:
            return t.translate('result-code.ACCESS_DENIED')
    }
    return 'UNKNOWN'
}
