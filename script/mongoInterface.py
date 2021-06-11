from pymongo import MongoClient
from bson.binary import Binary
try:
    from dotenv import load_dotenv
except:
    load_dotenv = None

import os

class MongoInterface:
    def __init__(self, prod=True):
        if load_dotenv: load_dotenv()
        if prod:
            _env = os.environ
            
        self._dbUrl = "mongodb+srv://{}:{}@{}/{}?retryWrites=true&w=majority".format(_env['MONGO_USER'], _env['MONGO_PASS'], _env['MONGO_URL'], _env['MONGO_DB_NAME'])

        self.client = MongoClient(self._dbUrl)

        self.db = self.client.get_database(_env['MONGO_DB_NAME'])
