import {
    EventType,
    RSCPAnswerParsedEvent,
    RSCPRequestResponseEvent,
    RSCPRequestResponseListener,
    StringFrameConverter
} from 'easy-rscp';
import {Logger} from '../internal-api/logger';

export class LogRscpCommunicationListener implements RSCPRequestResponseListener {
    private converter = new StringFrameConverter(true)
    constructor(private log: Logger) {

    }

    onRSCPRequestResponseEvent(event: RSCPRequestResponseEvent): void {
        if (event.type == EventType.BEFORE_ENCRYPTION) {
            this.log.log('REQUEST --->')
            this.log.log(this.converter.convert(event.requestFrame))
        } else if (event.type == EventType.ANSWER_PARSED) {
            this.log.log('RESPONSE --->')
            const convertedEvent: RSCPAnswerParsedEvent = event as RSCPAnswerParsedEvent
            this.log.log(this.converter.convert(convertedEvent.parsedFrame))
        }
    }

}
