from dotenv import load_dotenv
import os

load_dotenv()

class Creds:
    conString = 'frosted-fabrics.ctesqau4gr0e.us-east-1.rds.amazonaws.com'
    userName = os.getenv('dbusername')
    password = os.getenv('dbpassword')
    dbName = 'frostedfabrics'
