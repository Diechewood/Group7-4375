__authors__ = "John Tran, Kevin Tojin, Elian Gutierrez"

import logging
import flask
from flask import jsonify, request, make_response
import sql
import creds
import traceback
from urllib.parse import unquote
import time
import mysql.connector
import json

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# setting up an application name
app = flask.Flask(__name__)  # sets up the application
app.config["DEBUG"] = True  # allow to show errors in browser

# Function to create a database connection with retry mechanism
def get_db_connection():
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            conn = sql.create_connection(creds.Creds.conString, creds.Creds.userName, creds.Creds.password, creds.Creds.dbName)
            return conn
        except mysql.connector.Error as err:
            logger.error(f"Database connection attempt {attempt + 1} failed: {err}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise

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
    return make_response(jsonify("SUCCESS"), 200)

# ============== PRODUCTS METHODS ============
@app.route('/api/products', methods=['GET'])
@app.route('/api/products/<int:resourceid>', methods=['GET'])
def productsGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        
        if resourceid is not None:
            query = "SELECT * FROM frostedfabrics.products WHERE prod_id = %s"
            params = (resourceid,)
        else:
            category = unquote(request.args.get('category', ''))
            query = """
                SELECT p.*, pc.pc_name
                FROM frostedfabrics.products p
                JOIN frostedfabrics.product_categories pc ON p.pc_id = pc.pc_id
            """
            params = None
            if category:
                query += " WHERE pc.pc_name = %s"
                params = (category,)

        logger.info(f"Executing query: {query} with params: {params}")
        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        logger.info(f"Query results count: {len(query_results)}")
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in productsGet: {str(e)}")
        logger.error(traceback.format_exc())
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/products', methods=['POST'])
def productsPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.products (pc_id, prod_name, prod_cost, prod_msrp, prod_time, img_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (
            request_data['pc_id'],
            request_data['prod_name'],
            request_data['prod_cost'],
            request_data['prod_msrp'],
            request_data['prod_time'],
            request_data['img_id']
        )
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/products/<int:resourceid>', methods=['PUT', 'PATCH'])
def productsEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.products SET "
        params = []
        update_fields = ['pc_id', 'prod_name', 'prod_cost', 'prod_msrp', 'prod_time', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE prod_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/products/<int:resourceid>', methods=['DELETE'])
def productsDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.products WHERE prod_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== PRODUCT VARIATIONS METHODS ============
@app.route('/api/productvariations', methods=['GET'])
@app.route('/api/productvariations/<int:resourceid>', methods=['GET'])
def productvariationsGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        
        if resourceid is not None:
            query = """
                SELECT 
                    pv.*,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'mat_id', m.mat_id,
                            'mat_name', m.mat_name,
                            'mat_sku', m.mat_sku,
                            'mat_amount', vm.mat_amount,
                            'brand_name', mb.brand_name,
                            'mc_name', mc.mc_name,
                            'meas_unit', mm.meas_unit
                        )
                    ) as materials
                FROM frostedfabrics.product_variations pv
                LEFT JOIN frostedfabrics.variation_materials vm ON pv.var_id = vm.var_id
                LEFT JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
                LEFT JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                LEFT JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
                WHERE pv.var_id = %s
                GROUP BY pv.var_id
            """
            params = (resourceid,)
        else:
            product = request.args.get('product')
            query = """
                SELECT 
                    pv.*,
                    JSON_ARRAYAGG(
                        IF(m.mat_id IS NOT NULL,
                            JSON_OBJECT(
                                'mat_id', m.mat_id,
                                'mat_name', m.mat_name,
                                'mat_sku', m.mat_sku,
                                'mat_amount', vm.mat_amount,
                                'brand_name', mb.brand_name,
                                'mc_name', mc.mc_name,
                                'meas_unit', mm.meas_unit
                            ),
                            NULL
                        )
                    ) as materials
                FROM frostedfabrics.product_variations pv
                LEFT JOIN frostedfabrics.variation_materials vm ON pv.var_id = vm.var_id
                LEFT JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
                LEFT JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                LEFT JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            """
            params = None
            if product:
                query += " WHERE pv.prod_id = %s"
                params = (product,)
            query += " GROUP BY pv.var_id"

        logger.info(f"Executing query: {query} with params: {params}")
        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        # Process the materials JSON string and handle NULL values
        for result in query_results:
            try:
                materials = json.loads(result['materials'])
                # Filter out NULL values and empty objects
                result['materials'] = [m for m in materials if m and m.get('mat_id') is not None]
            except (json.JSONDecodeError, TypeError):
                result['materials'] = []
        
        logger.info(f"Query results count: {len(query_results)}")
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in productvariationsGet: {str(e)}")
        logger.error(traceback.format_exc())
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productvariations', methods=['POST'])
def productvariationsPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.product_variations (prod_id, var_name, var_inv, var_goal, img_id)
        VALUES (%s, %s, %s, %s, %s)
        """
        params = (
            request_data['prod_id'],
            request_data['var_name'],
            request_data['var_inv'],
            request_data['var_goal'],
            request_data['img_id']
        )
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productvariationsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productvariations/<int:resourceid>', methods=['PUT', 'PATCH'])
def productvariationsEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.product_variations SET "
        params = []
        update_fields = ['prod_id', 'var_name', 'var_inv', 'var_goal', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE var_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productvariationsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productvariations/<int:resourceid>', methods=['DELETE'])
def productvariationsDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.product_variations WHERE var_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productvariationsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== PRODUCT CATEGORIES METHODS ============
@app.route('/api/productcategories', methods=['GET'])
@app.route('/api/productcategories/<int:resourceid>', methods=['GET'])
def productcategoriesGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        if resourceid is not None:
            query = "SELECT * FROM frostedfabrics.product_categories WHERE pc_id = %s"
            params = (resourceid,)
        else:
            query = "SELECT * FROM frostedfabrics.product_categories"
            params = None

        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productcategories', methods=['POST'])
def productcategoriesPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.product_categories (pc_name, img_id)
        VALUES (%s, %s)
        """
        params = (request_data['pc_name'], request_data['img_id'])
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productcategories/<int:resourceid>', methods=['PUT', 'PATCH'])
def productcategoriesEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.product_categories SET "
        params = []
        update_fields = ['pc_name', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE pc_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/productcategories/<int:resourceid>', methods=['DELETE'])
def productcategoriesDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.product_categories WHERE pc_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== MATERIAL CATEGORIES METHODS ============
@app.route('/api/materialcategories', methods=['GET'])
@app.route('/api/materialcategories/<int:resourceid>', methods=['GET'])
def materialcategoriesGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        if resourceid is not None:
            query = "SELECT * FROM frostedfabrics.material_categories WHERE mc_id = %s"
            params = (resourceid,)
        else:
            query = "SELECT * FROM frostedfabrics.material_categories"
            params = None

        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialcategories', methods=['POST'])
def materialcategoriesPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.material_categories (meas_id, mc_name, img_id)
        VALUES (%s, %s, %s)
        """
        params = (request_data['meas_id'], request_data['mc_name'], request_data['img_id'])
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialcategories/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialcategoriesEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.material_categories SET "
        params = []
        update_fields = ['meas_id', 'mc_name', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE mc_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialcategories/<int:resourceid>', methods=['DELETE'])
def materialcategoriesDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.material_categories WHERE mc_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== MATERIAL BRANDS METHODS ============
@app.route('/api/materialbrands', methods=['GET'])
@app.route('/api/materialbrands/<int:resourceid>', methods=['GET'])
def materialbrandsGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        if resourceid is not None:
            query = "SELECT * FROM frostedfabrics.material_brands WHERE brand_id = %s"
            params = (resourceid,)
        else:
            query = "SELECT * FROM frostedfabrics.material_brands"
            params = None

        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialbrands', methods=['POST'])
def materialbrandsPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.material_brands (mc_id, brand_name, brand_price, img_id)
        VALUES (%s, %s, %s, %s)
        """
        params = (request_data['mc_id'], request_data['brand_name'], request_data['brand_price'], request_data['img_id'])
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialbrands/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialbrandsEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.material_brands SET "
        params = []
        update_fields = ['mc_id', 'brand_name', 'brand_price', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE brand_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materialbrands/<int:resourceid>', methods=['DELETE'])
def materialbrandsDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.material_brands WHERE brand_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== MATERIALS METHODS ============
@app.route('/api/materials', methods=['GET'])
@app.route('/api/materials/<int:resourceid>', methods=['GET'])
def materialsGet(resourceid=None):
    query_results = None
    conn = None
    try:
        conn = get_db_connection()
        
        if resourceid is not None:
            query = """
                SELECT m.*, mb.mc_id, mc.mc_name, mc.meas_id, mm.meas_unit
                FROM frostedfabrics.materials m
                JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
                WHERE m.mat_id = %s
            """
            params = (resourceid,)
        else:
            category = unquote(request.args.get('category', ''))
            query = """
                SELECT m.*, mb.mc_id, mc.mc_name, mc.meas_id, mm.meas_unit
                FROM frostedfabrics.materials m
                JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            """
            params = None
            if category:
                query += " WHERE mc.mc_name = %s"
                params = (category,)

        logger.info(f"Executing query: {query} with params: {params}")
        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        logger.info(f"Query results count: {len(query_results)}")
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in materialsGet: {str(e)}")
        logger.error(traceback.format_exc())
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materials', methods=['POST'])
def materialsPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = """
        INSERT INTO frostedfabrics.materials (brand_id, mat_name, mat_sku, mat_inv, mat_alert, img_id)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (
            request_data['brand_id'],
            request_data['mat_name'],
            request_data['mat_sku'],
            request_data['mat_inv'],
            request_data['mat_alert'],
            request_data['img_id']
        )
        sql.execute_query(conn, query, params)
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materials/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialsEdit(resourceid=None):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        query = "UPDATE frostedfabrics.materials SET "
        params = []
        update_fields = ['brand_id', 'mat_name', 'mat_sku', 'mat_inv', 'mat_alert', 'img_id']
        
        for field in update_fields:
            if request.method == 'PUT' or field in request_data:
                query += f"{field} = %s, "
                params.append(request_data.get(field, ''))
        
        query = query.rstrip(', ')
        query += " WHERE mat_id = %s"
        params.append(resourceid)

        sql.execute_query(conn, query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/materials/<int:resourceid>', methods=['DELETE'])
def materialsDelete(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        query = "DELETE FROM frostedfabrics.materials WHERE mat_id = %s"
        sql.execute_query(conn, query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

# ============== VARIATION MATERIALS METHODS ============
@app.route('/api/variationmaterials', methods=['GET'])
@app.route('/api/variationmaterials/<int:resourceid>', methods=['GET'])
def variationmaterialsGet(resourceid=None):
    conn = None
    try:
        conn = get_db_connection()
        
        if resourceid is not None:
            query = """
                SELECT 
                    vm.var_id,
                    vm.mat_id,
                    vm.mat_amount,
                    m.mat_name,
                    m.mat_sku,
                    mb.brand_name,
                    mc.mc_name,
                    mm.meas_unit
                FROM frostedfabrics.variation_materials vm
                JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
                JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
                WHERE vm.var_id = %s
                ORDER BY m.mat_name
            """
            params = (resourceid,)
        else:
            query = """
                SELECT 
                    vm.var_id,
                    vm.mat_id,
                    vm.mat_amount,
                    m.mat_name,
                    m.mat_sku,
                    mb.brand_name,
                    mc.mc_name,
                    mm.meas_unit
                FROM frostedfabrics.variation_materials vm
                JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
                JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
                ORDER BY vm.var_id, m.mat_name
            """
            params = None

        logger.info(f"Executing query: {query}")
        query_results = sql.execute_read_query(conn, query, params)
        
        if query_results is None:
            logger.error("Query returned None")
            return make_response(jsonify({"error": "Database query failed"}), 500)
        
        if resourceid is not None:
            if not query_results:
                return make_response(jsonify({"error": "No materials found for this variation"}), 404)
            return make_response(jsonify(query_results), 200)
        else:
            # Group materials by variation ID
            grouped_results = {}
            for row in query_results:
                var_id = row['var_id']
                if var_id not in grouped_results:
                    grouped_results[var_id] = []
                grouped_results[var_id].append(row)
            
            return make_response(jsonify(grouped_results), 200)
    except Exception as e:
        logger.error(f"Error in variationmaterialsGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/variationmaterials', methods=['POST'])
def variationmaterialsPost():
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        
        # Validate that the variation and material exist
        validation_query = """
            SELECT 
                (SELECT COUNT(*) FROM frostedfabrics.product_variations WHERE var_id = %s) as var_exists,
                (SELECT COUNT(*) FROM frostedfabrics.materials WHERE mat_id = %s) as mat_exists
        """
        validation = sql.execute_read_query(conn, validation_query, 
            (request_data['var_id'], request_data['mat_id']))
        
        if not validation[0]['var_exists'] or not validation[0]['mat_exists']:
            return make_response(jsonify({"error": "Invalid variation or material ID"}), 400)
        
        # Upsert the variation material
        upsert_query = """
            INSERT INTO frostedfabrics.variation_materials (var_id, mat_id, mat_amount)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE mat_amount = VALUES(mat_amount)
        """
        sql.execute_query(conn, upsert_query, (
            request_data['var_id'],
            request_data['mat_id'],
            request_data['mat_amount']
        ))
        
        # Fetch and return updated variation data using the same query as GET
        query = """
            SELECT 
                vm.var_id,
                vm.mat_id,
                vm.mat_amount,
                m.mat_name,
                m.mat_sku,
                mb.brand_name,
                mc.mc_name,
                mm.meas_unit
            FROM frostedfabrics.variation_materials vm
            JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
            JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
            JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
            LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            WHERE vm.var_id = %s
            ORDER BY m.mat_name
        """
        updated_data = sql.execute_read_query(conn, query, (request_data['var_id'],))
        return make_response(jsonify(updated_data), 201)
        
    except Exception as e:
        logger.error(f"Error in variationmaterialsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/variationmaterials/<int:var_id>/<int:mat_id>', methods=['PUT', 'PATCH'])
def variationmaterialsEdit(var_id, mat_id):
    request_data = request.get_json()
    conn = None
    try:
        conn = get_db_connection()
        
        # Update the material amount
        update_query = """
            UPDATE frostedfabrics.variation_materials 
            SET mat_amount = %s 
            WHERE var_id = %s AND mat_id = %s
        """
        result = sql.execute_query(conn, update_query, (
            request_data['mat_amount'],
            var_id,
            mat_id
        ))
        
        if result.rowcount == 0:
            return make_response(jsonify({"error": "Material not found for this variation"}), 404)
            
        # Fetch and return updated variation data using the same query as GET
        query = """
            SELECT 
                vm.var_id,
                vm.mat_id,
                vm.mat_amount,
                m.mat_name,
                m.mat_sku,
                mb.brand_name,
                mc.mc_name,
                mm.meas_unit
            FROM frostedfabrics.variation_materials vm
            JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
            JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
            JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
            LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            WHERE vm.var_id = %s
            ORDER BY m.mat_name
        """
        updated_data = sql.execute_read_query(conn, query, (var_id,))
        return make_response(jsonify(updated_data), 200)
        
    except Exception as e:
        logger.error(f"Error in variationmaterialsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

@app.route('/api/variationmaterials/<int:var_id>/<int:mat_id>', methods=['DELETE'])
def variationmaterialsDelete(var_id, mat_id):
    conn = None
    try:
        conn = get_db_connection()
        
        # Delete the material from the variation
        delete_query = """
            DELETE FROM frostedfabrics.variation_materials 
            WHERE var_id = %s AND mat_id = %s
        """
        result = sql.execute_query(conn, delete_query, (var_id, mat_id))
        
        if result.rowcount == 0:
            return make_response(jsonify({"error": "Material not found for this variation"}), 404)
            
        # Fetch and return updated variation data using the same query as GET
        query = """
            SELECT 
                vm.var_id,
                vm.mat_id,
                vm.mat_amount,
                m.mat_name,
                m.mat_sku,
                mb.brand_name,
                mc.mc_name,
                mm.meas_unit
            FROM frostedfabrics.variation_materials vm
            JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
            JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
            JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
            LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            WHERE vm.var_id = %s
            ORDER BY m.mat_name
        """
        updated_data = sql.execute_read_query(conn, query, (var_id,))
        return make_response(jsonify(updated_data), 200)
        
    except Exception as e:
        logger.error(f"Error in variationmaterialsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(threaded=True)