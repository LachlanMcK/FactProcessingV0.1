"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log("lots of checking going on here. Not!! (yet)");
exports.doCleanInputCheck = function (req, res, next) {
    // let result: boolean = false;
    // var frm: string = req.body.FormTypeMung;
    // req.body.Sections.forEach((section:any) => {
    //     section.LineItems.forEach((lineItem:any) => {
    //         const reString: string = regExs[frm][<number>section.SectionId][<number>lineItem.FieldId];
    //         if (reString) {
    //             result = new RegExp(reString).test(<string> lineItem.FieldValue);
    //             if (!result) 
    //                 next(new Error("Invalid input in field" + section.SectionId + " " + lineItem.FieldId));
    //         }
    //     })
    // });
    // next();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9TZWN1cmVDb2RpbmdDaGVja3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkb1NlY3VyZUNvZGluZ0NoZWNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLENBQUMsQ0FBQztBQUU5QyxRQUFBLGlCQUFpQixHQUFHLFVBQVUsR0FBb0IsRUFBRSxHQUFxQixFQUFFLElBQTBCO0lBQzlHLCtCQUErQjtJQUMvQiwyQ0FBMkM7SUFDM0MsK0NBQStDO0lBQy9DLG9EQUFvRDtJQUNwRCxxR0FBcUc7SUFDckcsMEJBQTBCO0lBQzFCLGdGQUFnRjtJQUNoRiw0QkFBNEI7SUFDNUIsMEdBQTBHO0lBQzFHLFlBQVk7SUFDWixTQUFTO0lBQ1QsTUFBTTtJQUNOLFVBQVU7QUFDZCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtyZWdFeHN9IGZyb20gJy4vc2VjdXJlQ29kaW5nUmVnRXhlcyc7XG5jb25zb2xlLmxvZyhcImxvdHMgb2YgY2hlY2tpbmcgZ29pbmcgb24gaGVyZS4gTm90ISEgKHlldClcIik7XG5cbmV4cG9ydCBjb25zdCBkb0NsZWFuSW5wdXRDaGVjayA9IGZ1bmN0aW9uIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIC8vIGxldCByZXN1bHQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICAvLyB2YXIgZnJtOiBzdHJpbmcgPSByZXEuYm9keS5Gb3JtVHlwZU11bmc7XG4gICAgLy8gcmVxLmJvZHkuU2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbjphbnkpID0+IHtcbiAgICAvLyAgICAgc2VjdGlvbi5MaW5lSXRlbXMuZm9yRWFjaCgobGluZUl0ZW06YW55KSA9PiB7XG4gICAgLy8gICAgICAgICBjb25zdCByZVN0cmluZzogc3RyaW5nID0gcmVnRXhzW2ZybV1bPG51bWJlcj5zZWN0aW9uLlNlY3Rpb25JZF1bPG51bWJlcj5saW5lSXRlbS5GaWVsZElkXTtcbiAgICAvLyAgICAgICAgIGlmIChyZVN0cmluZykge1xuICAgIC8vICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBSZWdFeHAocmVTdHJpbmcpLnRlc3QoPHN0cmluZz4gbGluZUl0ZW0uRmllbGRWYWx1ZSk7XG4gICAgLy8gICAgICAgICAgICAgaWYgKCFyZXN1bHQpIFxuICAgIC8vICAgICAgICAgICAgICAgICBuZXh0KG5ldyBFcnJvcihcIkludmFsaWQgaW5wdXQgaW4gZmllbGRcIiArIHNlY3Rpb24uU2VjdGlvbklkICsgXCIgXCIgKyBsaW5lSXRlbS5GaWVsZElkKSk7XG4gICAgLy8gICAgICAgICB9XG4gICAgLy8gICAgIH0pXG4gICAgLy8gfSk7XG4gICAgLy8gbmV4dCgpO1xufTsiXX0=