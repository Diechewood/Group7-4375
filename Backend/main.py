__authors__ = "John Tran, Kevin Tojin"

import creds
import sql
import flask

# Sets up connection to DB
conn = sql.create_connection(creds.Creds.conString, creds.Creds.userName, creds.Creds.password, creds.Creds.dbName)

# setting up an application name
app = flask.Flask(__name__) # sets up the application
app.config["DEBUG"] = True # allow to show errors in browser

# ============== EXAMPLE METHODS ============
# Set up back end routes
@app.route('/api/test', methods=['GET'])
def test():
    return flask.make_response(flask.jsonify("SUCCESS"), 200)

# ============== PODUCT CATEGORIES METHODS ============
@app.route('/api/productcategories', methods=['GET'])
@app.route('/api/productcategories/<int:resouceid>', methods=['GET'])
def productcategoriesGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM Frosted_Fabrics.product_categories
                WHERE pc_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM Frosted_Fabrics.product_categories;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/productcategories', methods=['POST'])
def productcategoriesPost():
    request_data =  flask.request.get_json()
    try:
        sql.execute_query(conn, f"""
        INSERT INTO Frosted_Fabrics.product_categories (pc_name, img_id)
        VALUES ('{request_data['pc_name']}','{request_data['img_id']}');
    """)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)
    

@app.route('/api/productcategories/<int:resouceid>', methods=['PUT', 'PATCH'])
def productcategoriesEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE Frosted_Fabrics.product_categories SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'pc_name' in request_data:
        query_parts.append(f"pc_name = '{request_data.get('pc_name', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE pc_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/productcategories/<int:resouceid>', methods=['DELETE'])
def productcategoriesDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM Frosted_Fabrics.product_categories
            WHERE pc_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)





app.run()
