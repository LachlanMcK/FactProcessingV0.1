"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log("lots of checking going on here!!");
function thereExistsRelationshipBetween(user, subject) {
    return true;
}
function verifySubjectClientLinks(user, subject) {
    if (user == subject)
        return true;
    if (thereExistsRelationshipBetween(user, subject))
        return true;
    return false;
}
exports.checkAuthorisation = function (req, res, next) {
    console.log("AM goes here - checks that user can act on subject");
    //verifySubjectClientLinks(req.headers.authorization, req.params.ClientInternalId);
    next();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tBdXRob3Jpc2F0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hlY2tBdXRob3Jpc2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWhELFNBQVMsOEJBQThCLENBQUMsSUFBVyxFQUFFLE9BQWM7SUFDL0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsSUFBVyxFQUFFLE9BQWM7SUFDekQsSUFBSSxJQUFJLElBQUksT0FBTztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ2pDLElBQUksOEJBQThCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQy9ELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFFWSxRQUFBLGtCQUFrQixHQUFFLFVBQVUsR0FBb0IsRUFBRSxHQUFxQixFQUFFLElBQTBCO0lBQzlHLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQztJQUNsRSxtRkFBbUY7SUFFbkYsSUFBSSxFQUFFLENBQUM7QUFDWCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuY29uc29sZS5sb2coXCJsb3RzIG9mIGNoZWNraW5nIGdvaW5nIG9uIGhlcmUhIVwiKTtcblxuZnVuY3Rpb24gdGhlcmVFeGlzdHNSZWxhdGlvbnNoaXBCZXR3ZWVuKHVzZXI6bnVtYmVyLCBzdWJqZWN0Om51bWJlcikge1xuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB2ZXJpZnlTdWJqZWN0Q2xpZW50TGlua3ModXNlcjpudW1iZXIsIHN1YmplY3Q6bnVtYmVyKXtcbiAgICBpZiAodXNlciA9PSBzdWJqZWN0KSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodGhlcmVFeGlzdHNSZWxhdGlvbnNoaXBCZXR3ZWVuKHVzZXIsIHN1YmplY3QpKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjb25zdCBjaGVja0F1dGhvcmlzYXRpb249IGZ1bmN0aW9uIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIGNvbnNvbGUubG9nKFwiQU0gZ29lcyBoZXJlIC0gY2hlY2tzIHRoYXQgdXNlciBjYW4gYWN0IG9uIHN1YmplY3RcIik7XG4gICAgLy92ZXJpZnlTdWJqZWN0Q2xpZW50TGlua3MocmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbiwgcmVxLnBhcmFtcy5DbGllbnRJbnRlcm5hbElkKTtcblxuICAgIG5leHQoKTtcbn07Il19