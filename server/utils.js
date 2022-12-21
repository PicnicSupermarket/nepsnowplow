function debounce(func, wait, immediate) {
    let timeout;

    return function executedFunction() {
        const context = this;
        // eslint-disable-next-line prefer-rest-params
        const args = arguments;

        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

class Logger {
    static info(message) {
        // eslint-disable-next-line no-console
        console.log(message);
    }

    static error(message) {
        // eslint-disable-next-line no-console
        console.error(message);
    }
}

module.exports = {
    debounce,
    Logger,
};
