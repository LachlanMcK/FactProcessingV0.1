function addMissingBrowserStuff() {
    window = {}; //rulesEngine.JS has dependency on global windows object
    window.ato = {};
    window.ato.enableJSRELogging = true; //used in rulesEngine.js.run method
    if (!console.group)
        console.group = (msg) => { console.log(msg); };
    if (!console.groupEnd)
        console.groupEnd = () => { console.log("----end group---"); };
    // window.require = function (anything) { return require("./forms/oTH_PAYROLL_EVENT_CHILDForm"); };
}
exports.addMissingBrowserStuff = addMissingBrowserStuff;
