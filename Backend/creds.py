from dotenv import load_dotenv
import os

load_dotenv()
print(os.getenv('dbusername'))

class Creds:
    conString = 'frosted-fabrics.ctesqau4gr0e.us-east-1.rds.amazonaws.com'
    userName = os.getenv('dbusername')
    password = os.getenv('dbpassword')
    dbName = 'frostedfabrics'
