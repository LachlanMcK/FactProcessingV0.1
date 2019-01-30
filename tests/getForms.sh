echo "hi"
#curl -v http://127.0.0.1:8080/forms/5c3e8dce35f35809adb1aaf5 -o output.json
# curl -v http://127.0.0.1:3000/api/v1/Clients/ABN/12345678901/Accounts/1/Roles/PayrollEvent/ChildPayrollEvent -o output.json
# curl -v http://127.0.0.1:3000/api/v1/Clients/ABN/1234567890/Accounts/1 -o output.json
# curl -v http://127.0.0.1:3000/api/v1/Clients/ABN/1234567890 -o output.json
#curl -v http://127.0.0.1:3000/api/v1/Clients -o output.json

curl -v http://127.0.0.1:8080/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/myFT6Form/112233440?filter="PeriodBeginDate=2018-12-31,PeriodEndDate=2019-03-31" -o output.json
#curl -v http://127.0.0.1:3000/api/v1/Clients/ABN/1234567890 -o output.json
echo ----output.json---
cat output.json 
read x