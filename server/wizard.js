if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}
var fs = require('fs');

module.exports = {
    createProject: function(language, projectName, service, sampleName) {
        switch(language) {
            case "Java":
                execute('rm -rf workspace/' + projectName + ' && ' +
                    'cd workspace &&' +
                    'mvn -B archetype:generate' +
                    ' -DarchetypeGroupId=org.apache.maven.archetypes' +
                    ' -DgroupId=' + 'aws.example.s3' +
                    ' -DartifactId=' + projectName + ' && ' +
                    'cd ' + projectName + '/src/main/java/aws/example/s3 && ' +
                    'wget https://raw.githubusercontent.com/awsdocs/aws-doc-sdk-examples/master/java/example_code/s3/src/main/java/aws/example/s3/' + sampleName + '.java' + ' && ' +
                    'rm App.java');
                break;

            case "CPP":
                execute('rm -rf workspace/' + projectName + '&&' +
                    'cd workspace &&' +
                    'mkdir ' + projectName
                );
                fs.writeFileSync("workspace/"+projectName+"/main.cpp", emptyCppSource(service));
                break;

            default:
                console.log("Unhandled language: " + language);
        }
    }
}

function execute(command) {
    var execSync = require('child_process').execSync, child;
    child = execSync(command, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        });
    // child();
}

function emptyCppSource(serviceName) {
    var variable = {};
    var service2Namespace = {
        "dynamodb": "DynamoDB",
        "ec2": "EC2",
        "s3": "S3",
        "sqs": "SQS"
    };

    function assambleAll(statementList) {
        var snippet = "";
        for (i in statementList) {
            if (Array.isArray(statementList[i])) {
                for (j in statementList[i]) {
                    snippet += statementList[i][j];
                    snippet += "\n";
                }
            } else {
                snippet += statementList[i];
                snippet += "\n";
            }
            snippet += "\n";
        }
        return snippet;
    }

    // Init Header
    var headerStatement = [];
    headerStatement[0] = "#include <aws/core/Aws.h>;";
    headerStatement[1] = "#include <aws/{0}/{1}Client.h>;".format(serviceName, service2Namespace[serviceName]);

    // Init sdk
    var sdkStatement = [];
    sdkStatement[0] = "int main(int argc, char** argv)";
    sdkStatement[1] = "{";
    sdkStatement[2] = "Aws::SDKOptions options;";
    sdkStatement[3] = "Aws::InitAPI(options);";

    // Init configuration
    var region = "us-east-1";
    variable["config"] = "config";
    variable["client"] = serviceName + "Client";

    var configStatement = [];
    configStatement[0] = "Aws::Client::ClientConfiguration {0};".format(variable.config);
    configStatement[1] = "{0}.region = {1};".format(variable.config, region);

    // Init client
    var clientStatement = "Aws::{0}::{0}Client {1}({2});".format(
        service2Namespace[serviceName], variable.client, variable.config);

    // Insert your code here.
    var insertStatement = "// Insert your code here.";

    // End sdk
    var endStatement = [];
    endStatement[0] = "Aws::ShutdownAPI(options);";
    endStatement[1] = "}";

    return assambleAll([headerStatement, sdkStatement, configStatement, clientStatement, insertStatement, endStatement]);
}

// createProject("java", "s3example", "s3", "ListBuckets");