__authors__ = "John Tran, Kevin Tojin"

import creds
import sql
import flask

# Sets up connection to DB
conn = sql.create_connection(creds.Creds.conString, creds.Creds.userName, creds.Creds.password, creds.Creds.dbName)

# setting up an application name
app = flask.Flask(__name__) # sets up the application
app.config["DEBUG"] = False # allow to show errors in browser

# Enable CORS for all routes
@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

# ============== EXAMPLE METHODS ============
# Set up back end routes
@app.route('/api/test', methods=['GET'])
def test():
    return flask.make_response(flask.jsonify("SUCCESS"), 200)

# ============== PRODUCTS METHODS ============
@app.route('/api/products', methods=['GET'])
@app.route('/api/products/<int:resouceid>', methods=['GET'])
def productsGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.products
                WHERE prod_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.products;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/products', methods=['POST'])
def productsPost():
    request_data =  flask.request.get_json()
    try:
        sql.execute_query(conn, f"""
        INSERT INTO frostedfabrics.products (pc_id, prod_name, prod_cost, prod_msrp, prod_time, img_id)
        VALUES ('{request_data['pc_id']}','{request_data['prod_name']}','{request_data['prod_cost']}','{request_data['prod_msrp']}','{request_data['prod_time']}','{request_data['img_id']}');
    """)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)
    

@app.route('/api/products/<int:resouceid>', methods=['PUT', 'PATCH'])
def productsEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.products SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'pc_id' in request_data:
        query_parts.append(f"pc_id = '{request_data.get('pc_id', '')}'")
    if flask.request.method == 'PUT' or 'prod_name' in request_data:
        query_parts.append(f"prod_name = '{request_data.get('prod_name', '')}'")
    if flask.request.method == 'PUT' or 'prod_cost' in request_data:
        query_parts.append(f"prod_cost = '{request_data.get('prod_cost', '')}'")
    if flask.request.method == 'PUT' or 'prod_msrp' in request_data:
        query_parts.append(f"prod_msrp = '{request_data.get('prod_msrp', '')}'")
    if flask.request.method == 'PUT' or 'prod_name' in request_data:
        query_parts.append(f"prod_time = '{request_data.get('prod_time', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE prod_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/products/<int:resouceid>', methods=['DELETE'])
def productsDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.products
            WHERE prod_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


# ============== PRODUCT VARIATIONS METHODS ============
@app.route('/api/productvariations', methods=['GET'])
@app.route('/api/productvariations/<int:resouceid>', methods=['GET'])
def productvariationsGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.product_variations
                WHERE var_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.product_variations;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/productvariations', methods=['POST'])
def productvariationsPost():
    request_data =  flask.request.get_json()
    try:
        sql.execute_query(conn, f"""
        INSERT INTO frostedfabrics.product_variations (prod_id, var_name, var_inv, var_goal, img_id)
        VALUES ('{request_data['prod_id']}','{request_data['var_name']}','{request_data['var_inv']}','{request_data['var_goal']}','{request_data['img_id']}');
    """)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)
    

@app.route('/api/productvariations/<int:resouceid>', methods=['PUT', 'PATCH'])
def productvariationsEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.product_variations SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'prod_id' in request_data:
        query_parts.append(f"prod_id = '{request_data.get('prod_id', '')}'")
    if flask.request.method == 'PUT' or 'var_name' in request_data:
        query_parts.append(f"var_name = '{request_data.get('var_name', '')}'")
    if flask.request.method == 'PUT' or 'var_inv' in request_data:
        query_parts.append(f"var_inv = '{request_data.get('var_inv', '')}'")
    if flask.request.method == 'PUT' or 'var_goal' in request_data:
        query_parts.append(f"var_goal = '{request_data.get('var_goal', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE var_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/productvariations/<int:resouceid>', methods=['DELETE'])
def productvariationsDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.product_variations
            WHERE var_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)
    

# ============== PRODUCT CATEGORIES METHODS ============
@app.route('/api/productcategories', methods=['GET'])
@app.route('/api/productcategories/<int:resouceid>', methods=['GET'])
def productcategoriesGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.product_categories
                WHERE pc_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.product_categories;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/productcategories', methods=['POST'])
def productcategoriesPost():
    request_data =  flask.request.get_json()
    try:
        sql.execute_query(conn, f"""
        INSERT INTO frostedfabrics.product_categories (pc_name, img_id)
        VALUES ('{request_data['pc_name']}','{request_data['img_id']}');
    """)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)
    

@app.route('/api/productcategories/<int:resouceid>', methods=['PUT', 'PATCH'])
def productcategoriesEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.product_categories SET "
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
            DELETE FROM frostedfabrics.product_categories
            WHERE pc_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)

# ============== MATERIAL CATEGORIES METHODS ============
@app.route('/api/materialcategories', methods=['GET'])
@app.route('/api/materialcategories/<int:resouceid>', methods=['GET'])
def materialcategoriesGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.material_categories
                WHERE mc_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.material_categories;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materialcategories', methods=['POST'])
def materialcategoriesPost():
     request_data =  flask.request.get_json()
     try:
         sql.execute_query(conn, f"""
         INSERT INTO frostedfabrics.material_categories (meas_id, mc_name, img_id)
         VALUES ('{request_data['meas_id']}','{request_data['mc_name']}','{request_data['img_id']}');
     """)
         return flask.make_response("", 200)
     except:
         return flask.make_response("Internal Server Error",500)
    

@app.route('/api/materialcategories/<int:resouceid>', methods=['PUT', 'PATCH'])
def materialcategoriesEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.material_categories SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'meas_id' in request_data:
        query_parts.append(f"meas_id = '{request_data.get('meas_id', '')}'")
    if flask.request.method == 'PUT' or 'mc_name' in request_data:
        query_parts.append(f"mc_name = '{request_data.get('mc_name', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE mc_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materialcategories/<int:resouceid>', methods=['DELETE'])
def materialcategoriesDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.material_categories
            WHERE mc_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)

# # ============== MATERIAL BRANDS METHODS ============
@app.route('/api/materialbrands', methods=['GET'])
@app.route('/api/materialbrands/<int:resouceid>', methods=['GET'])
def materialbrandsGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.material_brands
                WHERE brand_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.material_brands;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materialbrands', methods=['POST'])
def materialbrandsPost():
     request_data =  flask.request.get_json()
     try:
         sql.execute_query(conn, f"""
         INSERT INTO frostedfabrics.material_brands (mc_id, brand_name, brand_price, img_id)
         VALUES ('{request_data['mc_id']}','{request_data['brand_name']}','{request_data['brand_price']}','{request_data['img_id']}');
     """)
         return flask.make_response("", 200)
     except:
         return flask.make_response("Internal Server Error",500)
    

@app.route('/api/materialbrands/<int:resouceid>', methods=['PUT', 'PATCH'])
def materialbrandsEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.material_brands SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'mc_id' in request_data:
        query_parts.append(f"mc_id = '{request_data.get('mc_id', '')}'")
    if flask.request.method == 'PUT' or 'brand_name' in request_data:
        query_parts.append(f"brand_name = '{request_data.get('brand_name', '')}'")
    if flask.request.method == 'PUT' or 'brand_price' in request_data:
        query_parts.append(f"brand_price = '{request_data.get('brand_price', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE brand_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materialbrands/<int:resouceid>', methods=['DELETE'])
def materialbrandsDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.material_brands
            WHERE brand_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)

 # ============== MATERIALS METHODS ============
@app.route('/api/materials', methods=['GET'])
@app.route('/api/materials/<int:resouceid>', methods=['GET'])
def materialsGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.materials
                WHERE mat_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.materials;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materials', methods=['POST'])
def materialsPost():
     request_data =  flask.request.get_json()
     try:
         sql.execute_query(conn, f"""
         INSERT INTO frostedfabrics.materials (brand_id, mat_name, mat_sku, mat_inv, mat_alert, img_id)
         VALUES ('{request_data['brand_id']}','{request_data['mat_name']}','{request_data['mat_sku']}','{request_data['mat_inv']}','{request_data['mat_alert']}','{request_data['img_id']}');
     """)
         return flask.make_response("", 200)
     except:
         return flask.make_response("Internal Server Error",500)
    

@app.route('/api/materials/<int:resouceid>', methods=['PUT', 'PATCH'])
def materialsEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.materials SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'brand_id' in request_data:
        query_parts.append(f"brand_id = '{request_data.get('brand_id', '')}'")
    if flask.request.method == 'PUT' or 'mat_name' in request_data:
        query_parts.append(f"mat_name = '{request_data.get('mat_name', '')}'")
    if flask.request.method == 'PUT' or 'mat_sku' in request_data:
        query_parts.append(f"mat_sku = '{request_data.get('mat_sku', '')}'")
    if flask.request.method == 'PUT' or 'mat_inv' in request_data:
        query_parts.append(f"mat_inv = '{request_data.get('mat_inv', '')}'")
    if flask.request.method == 'PUT' or 'mat_alert' in request_data:
        query_parts.append(f"mat_alert = '{request_data.get('mat_alert', '')}'")
    if flask.request.method == 'PUT' or 'img_id' in request_data:
        query_parts.append(f"img_id = '{request_data.get('img_id', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE mat_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/materials/<int:resouceid>', methods=['DELETE'])
def materialsDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.materials
            WHERE mat_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)

# ============== VARIATION MATERIALS METHODS ============
@app.route('/api/variationmaterials', methods=['GET'])
@app.route('/api/variationmaterials/<int:resouceid>', methods=['GET'])
def variationmaterialsGet(resouceid=None):
    query_results = None
    try:
        if resouceid is not None:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.variation_materials
                WHERE var_id = {resouceid};
            """)
            if query_results:
                return flask.make_response(flask.jsonify(query_results[0]), 200)
            else:
                return flask.make_response(flask.jsonify("The requested resource was not found"), 404)
        else:
            query_results = sql.execute_read_query(conn, f"""
                SELECT * FROM frostedfabrics.variation_materials;
            """)
            return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/variationmaterials', methods=['POST'])
def variationmaterialsPost():
     request_data =  flask.request.get_json()
     try:
         sql.execute_query(conn, f"""
         INSERT INTO frostedfabrics.variation_materials (mat_id, mat_amount)
         VALUES ('{request_data['mat_id']}','{request_data['mat_amount']}');
     """)
         return flask.make_response("", 200)
     except:
         return flask.make_response("Internal Server Error",500)
    

@app.route('/api/variationmaterials/<int:resouceid>', methods=['PUT', 'PATCH'])
def variationmaterialsEdit(resouceid=None):
    request_data =  flask.request.get_json()

    # Prepares query
    query = "UPDATE frostedfabrics.variation_materials SET "
    query_parts = []
    if flask.request.method == 'PUT' or 'mat_id' in request_data:
        query_parts.append(f"mat_id = '{request_data.get('mat_id', '')}'")
    if flask.request.method == 'PUT' or 'mat_amount' in request_data:
        query_parts.append(f"mat_amount = '{request_data.get('mat_amount', '')}'")

    if query_parts:
        query += ", ".join(query_parts)
        query += f" WHERE var_id = {resouceid};"

    try:
        sql.execute_query(conn, query)
        return flask.make_response("", 200)
    except:
        return flask.make_response("Internal Server Error",500)


@app.route('/api/variationmaterials/<int:resouceid>', methods=['DELETE'])
def variationmaterialsDelete(resouceid=None):
    try:
        query_results = sql.execute_query(conn, f"""
            DELETE FROM frostedfabrics.variation_materials
            WHERE var_id = {resouceid};
        """)
        return flask.make_response(flask.jsonify(query_results), 200)
    except:
        return flask.make_response("Internal Server Error",500)


app.run(threaded=True)
