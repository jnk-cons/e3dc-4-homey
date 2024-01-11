import {
    DailySummaryConverter,
    DataBuilder,
    DBTag,
    DefaultHomePowerPlantConnectionFactory,
    Duration,
    E3dcConnectionData,
    EMSTag,
    Frame,
    FrameBuilder, HistoryData,
    HomePowerPlantConnection,
    HomePowerPlantConnectionFactory, InfoTag, MonthlySummaryConverter, YearlySummaryConverter
} from 'easy-rscp';
import {LiveData} from './model/live-data';
import {SyncDataFrameConverter} from './converter/SyncDataFrameConverter';
import {SimpleClass} from 'homey';
import {SummaryData} from './model/summary-data';
import {SummaryType} from './model/summary.config';

let connection: HomePowerPlantConnection | undefined = undefined
let connectionFactory: HomePowerPlantConnectionFactory | undefined = undefined
let connectionData: E3dcConnectionData | undefined = undefined
export class RscpApi {
    init(data: E3dcConnectionData) {
        connectionData = data
        connectionFactory = new DefaultHomePowerPlantConnectionFactory(connectionData)
        this.closeConnection()
    }

    private getOpenConnection(): Promise<HomePowerPlantConnection> {
        return new Promise<HomePowerPlantConnection>((resolve, reject) => {
            if (connection && connection.isConnected()) {
                resolve(connection)
            }
            else {
                connectionFactory?.openConnection()
                    .then(con => {
                        connection = con;
                        resolve(connection)
                    })
                    .catch(e => reject(e))
            }
        })
    }

    closeConnection() {
        if (connection) {
            connection.disconnect().then()
            connection = undefined

        }
    }

    connectionTest(data: E3dcConnectionData): Promise<string | undefined> {
        return new Promise<string | undefined>( (resolve, reject) => {
            const tempConnectionFactory = new DefaultHomePowerPlantConnectionFactory(data)
            tempConnectionFactory
                .openConnection()
                .then(tempConnection => {
                    const request = new FrameBuilder()
                        .addData(
                            new DataBuilder().tag(EMSTag.REQ_POWER_PV).build()
                        )
                        .build()
                    tempConnection
                        .send(request)
                        .then(r => resolve(undefined))
                        .catch(e => resolve(e.toString()))
                        .finally(() => tempConnection.disconnect().then())
                })
                .catch(e => resolve(e.toString()))
        })
    }

    readSummaryData(summaryType: SummaryType, allowReconnect: boolean = true, log: SimpleClass): Promise<SummaryData> {
        return new Promise<SummaryData>((resolve, reject) => {
            const date = new Date()
            date.setHours(0, 0, 0, 0)
            log.log('readSummaryData: Requesting connection ...')
            this.getOpenConnection()
                .then(con => {
                    log.log('readSummaryData: Connection received')
                    const request= this.buildFrameBySummaryType(summaryType, log)
                    log.log('readSummaryData: Sending request frame ...')
                    con.send(request)
                        .then(response => {
                            log.log('readSummaryData: Answer received')
                            const result = this.parseSummaryData(request, response, summaryType)
                            resolve(result)
                        })
                        .catch(e => this.handleReadSummaryDataDataError(
                            summaryType,
                            allowReconnect,
                            e,
                            resolve,
                            reject,
                            log
                        ))

                })
                .catch(e => this.handleReadSummaryDataDataError(
                    summaryType,
                    allowReconnect,
                    e,
                    resolve,
                    reject,
                    log
                ))
        })
    }

    private parseSummaryData(request: Frame, response: Frame, summaryType: SummaryType): SummaryData {
        let rscpResult: HistoryData
        if (summaryType == SummaryType.YESTERDAY || summaryType == SummaryType.TODAY) {
            const converter = new DailySummaryConverter()
            rscpResult = converter.convert(request, response)
        }
        else if (summaryType == SummaryType.LAST_MONTH || summaryType == SummaryType.CURRENT_MONTH) {
            const converter = new MonthlySummaryConverter()
            rscpResult = converter.convert(request, response)
        } else {
            const converter = new YearlySummaryConverter()
            rscpResult = converter.convert(request, response)
        }

        return {
            pvDelivery: rscpResult.pvDelivery,
            batteryIn: rscpResult.batteryIn,
            batteryOut: rscpResult.batteryOut,
            gridIn: rscpResult.gridIn,
            gridOut: rscpResult.gridOut,
            houseConsumption: rscpResult.houseConsumption,
            selfConsumption: rscpResult.selfConsumption,
            selfSufficiency: rscpResult.selfSufficiency
        }
    }

    private buildFrameBySummaryType(summaryType: SummaryType, log: SimpleClass): Frame {
        if (summaryType == SummaryType.TODAY || summaryType == SummaryType.YESTERDAY) {
            const _24_HOURS_SECONDS = 24 * 60 * 60
            let date = new Date()
            if (summaryType == SummaryType.YESTERDAY) {
                date.setDate(date.getDate() - 1)
            }
            date = new Date(date.setHours(0, 0, 0, 0))
            log.log('Startdate: ' + date + ' - duration (seconds): ' + _24_HOURS_SECONDS)
            return new FrameBuilder()
                .addData(
                    new DataBuilder().tag(DBTag.REQ_HISTORY_DATA_DAY).container(
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_START).timestamp(date).build(),
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_INTERVAL).duration({
                            seconds: _24_HOURS_SECONDS,
                            nanos: 0
                        }).build(),
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_SPAN).duration({
                            seconds: _24_HOURS_SECONDS,
                            nanos: 0
                        }).build()
                    )
                    .build()
                )
                .build()
        }
        else if (summaryType == SummaryType.CURRENT_MONTH || summaryType == SummaryType.LAST_MONTH) {
            let date = new Date()
            if (summaryType == SummaryType.LAST_MONTH) {
                if (date.getMonth() == 0) {
                    date.setFullYear(date.getFullYear() - 1, 11, 1)
                }
                else {
                    date.setMonth(date.getMonth() - 1, 1);
                }
            }
            else {
                date.setMonth(date.getMonth(), 1);
            }

            date.setHours(0, 0, 0, 0);
            const daysOfMonth= this.getDaysInMonth(date);
            const duration: Duration = {
                seconds: daysOfMonth * 24 * 60 * 60,
                nanos: 0
            }
            log.log('Startdate: ' + date + ' - duration (days): ' + daysOfMonth + ' - duration (seconds): ' + duration.seconds)
            return new FrameBuilder()
                .addData(
                    new DataBuilder().tag(DBTag.REQ_HISTORY_DATA_MONTH).container(
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_START).timestamp(date).build(),
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_INTERVAL).duration(duration).build(),
                        new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_SPAN).duration(duration).build()
                    )
                        .build()
                )
                .build();
        }

        let yearOffset = 0
        if (summaryType == SummaryType.LAST_YEAR) {
            yearOffset = 1
        }
        let now = new Date()

        let startOfYear = new Date(now.getFullYear() - yearOffset, 0, 1, 0, 0, 0, 0);
        const daysOfYear= this.getDaysInYear(startOfYear);
        const duration: Duration = {
            seconds: daysOfYear * 24 * 60 * 60,
            nanos: 0
        }
        log.log('Startdate: ' + startOfYear + ' - duration (days): ' + daysOfYear + ' - duration (seconds): ' + duration.seconds)
        return new FrameBuilder()
            .addData(
                new DataBuilder().tag(DBTag.REQ_HISTORY_DATA_YEAR).container(
                    new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_START).timestamp(startOfYear).build(),
                    new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_INTERVAL).duration(duration).build(),
                    new DataBuilder().tag(DBTag.REQ_HISTORY_TIME_SPAN).duration(duration).build()
                )
                    .build()
            )
            .build();

    }

    private getDaysInMonth(date: Date): number {
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        return lastDayOfMonth.getDate();
    }

    private getDaysInYear(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(date.getFullYear() + 1, 0, 0);
        const millisecondsInDay = 24 * 60 * 60 * 1000;

        return Math.round((lastDayOfYear.getTime() - firstDayOfYear.getTime()) / millisecondsInDay) + 1;
    }

    readLiveData(allowReconnect: boolean = true, log: SimpleClass): Promise<LiveData> {
        return new Promise<LiveData>((resolve, reject) => {
            const date = new Date()
            date.setHours(0, 0, 0, 0)
            log.log('readSyncData: Requesting connection ...')
            this.getOpenConnection()
                .then(con => {
                    log.log('readSyncData: Connection received')
                    const request= new FrameBuilder()
                        .addData(
                            new DataBuilder().tag(EMSTag.REQ_POWER_PV).build(),
                            new DataBuilder().tag(EMSTag.REQ_POWER_BAT).build(),
                            new DataBuilder().tag(EMSTag.REQ_POWER_GRID).build(),
                            new DataBuilder().tag(EMSTag.REQ_POWER_HOME).build(),
                            new DataBuilder().tag(EMSTag.REQ_BAT_SOC).build(),
                            new DataBuilder().tag(InfoTag.REQ_SW_RELEASE).build()
                        )
                        .build();
                    log.log('readSyncData: Sending request frame ...')
                    con.send(request)
                        .then(response => {
                            log.log('readSyncData: Answer received')
                            resolve(new SyncDataFrameConverter().convert(response))
                        })
                        .catch(e => this.handleReadSyncDataError(
                            allowReconnect,
                            e,
                            resolve,
                            reject,
                            log
                        ))

                })
                .catch(e => this.handleReadSyncDataError(
                    allowReconnect,
                    e,
                    resolve,
                    reject,
                    log
                ))
        })
    }

    private handleReadSyncDataError(
        allowReconnect: boolean,
        causingError: Error,
        resolve: ((value: LiveData | PromiseLike<LiveData>) => void),
        reject: ((reason?: any) => void),
        log: SimpleClass,

    ) {

        if (allowReconnect) {
            log.log('readSyncData: Received error. Try to reconnect ... (Error: ' + causingError + ')')
            this.closeConnection()
            this.readLiveData(false, log)
                .then(data => {
                    log.log('readSyncData: Retry was successfull')
                    resolve(data)
                })
                .catch(e => {
                    log.log('readSyncData: Retry failed also: ' + e)
                    reject(e)
                })
        }
        else {
            log.log('readSyncData: Received error. Error: ' + causingError)
            reject(causingError)
        }
    }

    private handleReadSummaryDataDataError(
        type: SummaryType,
        allowReconnect: boolean,
        causingError: Error,
        resolve: ((value: SummaryData | PromiseLike<SummaryData>) => void),
        reject: ((reason?: any) => void),
        log: SimpleClass,

    ) {

        if (allowReconnect) {
            log.log('readSummaryData: Received error. Try to reconnect ... (Error: ' + causingError + ')')
            this.closeConnection()
            this.readSummaryData(type, false, log)
                .then(data => {
                    log.log('readSummaryData: Retry was successfull')
                    resolve(data)
                })
                .catch(e => {
                    log.log('readSummaryData: Retry failed also: ' + e)
                    reject(e)
                })
        }
        else {
            log.log('readSummaryData: Received error. Error: ' + causingError)
            reject(causingError)
        }
    }

}
