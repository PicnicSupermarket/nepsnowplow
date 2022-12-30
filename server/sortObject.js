function sortObject(object) {
    const sortedObj = {};
    const keys = Object.keys(object);

    keys.sort((key1, key2) => {
        key1 = key1.toLowerCase();
        key2 = key2.toLowerCase();
        if (key1 < key2) return -1;
        if (key1 > key2) return 1;
        return 0;
    });

    keys.forEach((index) => {
        const key = keys[index];
        if (typeof object[key] === "object" && !(object[key] instanceof Array)) {
            sortedObj[key] = sortObject(object[key]);
        } else {
            sortedObj[key] = object[key];
        }
    });

    return sortedObj;
}

module.exports = sortObject;
