/**
 * @param {Date} date
 * @param {boolean} [show_time]
 * @returns {string}
 */
function showDate(date, show_time) {
    let date_format = {
        year: 'numeric', month: '2-digit', day: '2-digit',
    }
    if(show_time != null && show_time) {
        date_format.hour = '2-digit';
        date_format.minute = '2-digit';
        date_format.second = '2-digit';
        date_format.hour12 = false;
    }
    // @ts-ignore
    return date.toLocaleDateString("ru-RU", date_format)
}

/**
 * @param {string} str
 * @param {Date | null} date0
 * @param {Date | null} date1
 * @param {boolean | null | undefined} [time]
 * @returns {string}
 */
function appendPeriod(str, date0, date1, time) {

    if(date0 !== null) {
        // @ts-ignore
        str += ` from ${showDate(date0, time)}`;
    }
    if(date1 !== null) {
        // @ts-ignore
        str += ` to ${showDate(date1, time)}`;
    }
    return str
}

/**
 * @param {number} x
 * @returns {string}
 */
function showScore(x) {
    return x.toLocaleString('en-EN',{minimumFractionDigits:0, maximumFractionDigits:2})
}

module.exports = {
    appendPeriod,
    showScore,
    showDate,
}
