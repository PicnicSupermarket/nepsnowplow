const os = require("os");

var getNetworkInterfacesIps = function() {
    var ifaces = os.networkInterfaces();

    var interfaces = [];
    Object.keys(ifaces).forEach((ifname) => {
        var alias = 0;
        ifaces[ifname].forEach((iface) => {
            if (iface.family !== "IPv4" || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            interfaces.push(iface.address);
        });
    });
    return interfaces;
};

function currentIpAddress() {
    var ifaces = getNetworkInterfacesIps();
    return ifaces[0];
}

module.exports = {
    getNetworkInterfacesIps: getNetworkInterfacesIps,
    currentIpAddress: currentIpAddress
};
