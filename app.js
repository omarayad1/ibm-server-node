var express = require('express');
var bodyParser = require('body-parser');
var ibmdb = require('ibm_db');

env = JSON.parse(process.env.VCAP_SERVICES);
var nosqlUrl = env["cloudantNoSQLDB"][0]["credentials"]["url"];

var nano = require('nano')(nosqlUrl);


var credentials = env["sqldb"][0]["credentials"];
var dsnString = "DRIVER={DB2};DATABASE=" + credentials.db + ";UID=" + credentials.username + ";PWD=" +
    credentials.password + ";HOSTNAME=" + credentials.hostname + ";port=" + credentials.port;


var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.post('/', function(req, res) {
    if(req.body.clear){
        ibmdb.open(dsnString, function(err, conn){
            if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
            else{
                var sql = "DROP TABLE EMPLOYEES;";
                conn.querySync(sql);
                var sql = "CREATE TABLE EMPLOYEES (NAME VARCHAR(50),DEPARTMENT VARCHAR(20), SALARY INT, EMPNO INT NOT NULL PRIMARY KEY);";
                conn.querySync(sql);
                res.send({success: true, reason: "schema has been reset to its original form"});
            }
        });
    } else {
        ibmdb.open(dsnString, function (err, conn){
            if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
            else {
                var sql = "SELECT * FROM EMPLOYEES;"
                conn.query(sql, function (err, data){
                    if (err) res.send({success: false, reason: "can't execute sql query :" + err });
                    else res.send({success: true, data: data});
                });
            }
        });
    }
});

app.post('/addEmployee', function (req, res){
    var name = req.body.name;
    var empno = req.body.id;
    var department = req.body.department;
    var salary = req.body.salary;

    var sql = "INSERT INTO EMPLOYEES (NAME,DEPARTMENT,SALARY,EMPNO) VALUES ('" + name + "','" + department + "'," + salary + "," + empno + ");";
    ibmdb.open(dsnString, function(err, conn){
        if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function(err){
                if (err) res.send({success: false, reason: "can't add employee :" + err});
                else res.send({success: true, data: {name: name, id: empno, department: department, salary: salary}});
            });
        }
    });
});

app.post('/removeEmployee', function (req, res){
    var id = req.body.id;

    var sql = "DELETE FROM EMPLOYEES WHERE EMPNO= " + id + ";";

    ibmdb.open(dsnString, function (err, conn){
        if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function(err){
                if (err) res.send({success: false, reason: "can't remove employee :" + err});
                else res.send({success: true, id: id});
            });
        }
    });
});

app.post('/findEmployee', function (req, res){
    var id = req.body.id;

    var sql = "SELECT * FROM EMPLOYEES WHERE EMPNO= " + id + ";";

    ibmdb.open(dsnString, function (err, conn){
        if (err)  res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function (err, data) {
                if (err) res.send({success: false, reason: "can't retrieve employee :" + err});
                else res.send({success: true, data: data});
            });
        }
    });
});

app.post('/nosql', function (req, res){
    if(req.body.clear) {
        nano.db.destroy('employees', function (err) {
            if (err) res.send({success: false, reason: "can't destroy table :" + err});
            else {
                nano.db.create('employees', function (err) {
                    if (err) res.send({success: false, reason: "can't create database :" + err});
                    else res.send({success: true, reason: "successfully restarted schema"});
                });
            }
        });
    } else {
        var employees = nano.use('employees');
        employees.list(function (err, data) {
            if (err) res.send({success: false, reason: "failed to get all employees" + err});
            else res.send({success: true, data: data});
        });
    }
});

app.post('/nosql/addEmployee', function (req, res) {
    var name = req.body.name;
    var id = req.body.id;
    var department = req.body.department;
    var salary = req.body.salary;

    var employees = nano.use('employees');

    employees.insert({name: name, salary: salary, department: department}, id, function (err, data) {
        if (err) res.send({success: false, reason: "can't add employee :" + err});
        else res.send({success: true, data: data});
    });
});

app.post('/nosql/removeEmployee', function (req, res) {
    var id = req.body.id;

    var employees = nano.use('employees');

    employees.get(id, {rev_info: true}, function(err, data) {
        if (err) res.send({success: false, reason: "cant retrieve employee :" + err});
        else {
            var rev = data._rev
            employees.destroy(id, rev, function (err, data) {
                if (err) res.send({success: false, reason: "can't remove employee :" + err});
                else res.send({success: true, data: data});
            });
        }
    });
});

app.post('/nosql/findEmployee', function (req, res) {
    var id = req.body.id;

    var employees = nano.use('employees');

    employees.get(id, function (err, data) {
        if (err) res.send({success: false, reason: "can't retrieve employee"});
        else {
            data.EMPNO = data._id;
            data.NAME = data.name;
            data.DEPARTMENT = data.department;
            data.SALARY = data.salary;
            delete data._id;
            delete data.name;
            delete data.department;
            delete data.salary;
            delete data._rev;
            res.send({success: true, data: [data]});
        }
    });
});

app.listen(process.env.VCAP_APP_PORT);
