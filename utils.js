const {utcToZonedTime, format} = require('date-fns-tz')

exports.getTime = () => {
    const timeZone = 'Asia/Ho_Chi_Minh'
    const date = utcToZonedTime(new Date(), timeZone)
    return format(date, 'HH:mm:ss')
}
