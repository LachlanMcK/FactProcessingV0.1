//LM loading stuff so can  monkeypatch to remove dependency on .require
let mapping = require("./jsre/forms/oTH_PAYROLL_EVENT_CHILDMapping.js");
let re = require("./jsre/rulesEngine");
re.mappingDefintion = mapping;
function getSectionName_MappingClosure(mapping) {
    let m = mapping;
    return function (sectionId) {
        return mapping["oTH_PAYROLL_EVENT_CHILD"].sections[sectionId];
    };
}
;
function getFieldName_MappingClosure(mapping) {
    let m = mapping;
    return function (sectionId, fieldId) {
        let f = mapping["oTH_PAYROLL_EVENT_CHILD"].fields.find((f) => f[0] == sectionId && f[1] == fieldId);
        if (f)
            return f[3];
        else
            return "***wtf? field [" + sectionId + "," + fieldId + "] not found ***";
    };
}
;
re.prototype.getSectionName = getSectionName_MappingClosure(mapping);
re.prototype.getFieldName = getFieldName_MappingClosure(mapping);

module.exports=re;