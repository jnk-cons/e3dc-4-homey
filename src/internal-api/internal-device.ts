import {SimpleClass} from 'homey';
import {I18n} from './i18n';
import {Logger} from './logger';

export interface InternalDevice extends I18n, Logger {
    asSimple(): SimpleClass
}
