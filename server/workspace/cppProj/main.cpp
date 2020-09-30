#include <aws/core/Aws.h>;
#include <aws/s3/S3Client.h>;

int main(int argc, char** argv)
{
Aws::SDKOptions options;
Aws::InitAPI(options);

Aws::Client::ClientConfiguration config;
config.region = us-east-1;

Aws::S3::S3Client s3Client(config);

// Insert your code here.

Aws::ShutdownAPI(options);
}

