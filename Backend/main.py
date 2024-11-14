__authors__ = "John Tran, Kevin Tojin, Elian Gutierrez"

import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
import logging
import flask
from flask import jsonify, request, make_response
import creds
import traceback
from urllib.parse import unquote
import time

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Setting up the Flask application
app = flask.Flask(__name__)
app.config["DEBUG"] = True

# Create a connection pool with an adjusted size
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=10,  # Increased pool size to handle more concurrent requests
    pool_reset_session=True,
    host=creds.Creds.conString,
    user=creds.Creds.userName,
    password=creds.Creds.password,
    database=creds.Creds.dbName,
    connection_timeout=300,  # Timeout in seconds
)

@contextmanager
def get_db_connection():
    connection = connection_pool.get_connection()
    try:
        yield connection
    finally:
        connection.close()

def execute_select_query(query, params=None):
    max_retries = 3
    retry_delay = 1  # second

    for attempt in range(max_retries):
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, params)
                result = cursor.fetchall()
                return result
        except mysql.connector.Error as err:
            logger.error(f"Database error on attempt {attempt + 1}: {err}")
            if attempt == max_retries - 1:
                raise
            time.sleep(retry_delay)

def execute_write_query(query, params=None):
    max_retries = 3
    retry_delay = 1  # second

    for attempt in range(max_retries):
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
        except mysql.connector.Error as err:
            logger.error(f"Database error on attempt {attempt + 1}: {err}")
            if attempt == max_retries - 1:
                raise
            time.sleep(retry_delay)

# Enable CORS for all routes
@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

# ============== EXAMPLE METHODS ============
@app.route('/api/test', methods=['GET'])
def test():
    return make_response(jsonify("SUCCESS"), 200)

# ============== PRODUCTS METHODS ============
@app.route('/api/products', methods=['GET'])
@app.route('/api/products/<int:resourceid>', methods=['GET'])
def productsGet(resourceid=None):
    try:
        if resourceid is not None:
            query = """
                SELECT p.*, pc.pc_name
                FROM frostedfabrics.products p
                JOIN frostedfabrics.product_categories pc ON p.pc_id = pc.pc_id
                WHERE p.prod_id = %s
            """
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
        query_results = execute_select_query(query, params)
        
        logger.info(f"Query results count: {len(query_results)}")
        
        if resourceid is not None:
            return make_response(jsonify(query_results[0] if query_results else {"error": "Resource not found"}), 200 if query_results else 404)
        else:
            return make_response(jsonify(query_results), 200)
    except Exception as e:
        logger.error(f"Error in productsGet: {str(e)}")
        logger.error(traceback.format_exc())
        return make_response(jsonify({"error": "Internal server error", "details": str(e)}), 500)

@app.route('/api/products', methods=['POST'])
def productsPost():
    request_data = request.get_json()
    try:
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
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in productsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/products/<int:resourceid>', methods=['PUT', 'PATCH'])
def productsEdit(resourceid=None):
    request_data = request.get_json()
    try:
        update_fields = ['pc_id', 'prod_name', 'prod_cost', 'prod_msrp', 'prod_time', 'img_id']
        params = []
        query = "UPDATE frostedfabrics.products SET "
        query += ", ".join(f"{field} = %s" for field in update_fields if field in request_data)
        params = [request_data[field] for field in update_fields if field in request_data]
        query += " WHERE prod_id = %s"
        params.append(resourceid)
        execute_write_query(query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/products/<int:resourceid>', methods=['DELETE'])
def productsDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.products WHERE prod_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== PRODUCT VARIATIONS METHODS ============
@app.route('/api/productvariations', methods=['GET'])
@app.route('/api/productvariations/<int:resourceid>', methods=['GET'])
def productvariationsGet(resourceid=None):
    try:
        base_query = """
            SELECT 
                pv.*,
                m.mat_id,
                m.mat_name,
                m.mat_sku,
                m.mat_inv,
                vm.mat_amount,
                mb.brand_name,
                mc.mc_name,
                mm.meas_unit
            FROM frostedfabrics.product_variations pv
            LEFT JOIN frostedfabrics.variation_materials vm ON pv.var_id = vm.var_id
            LEFT JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
            LEFT JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
            LEFT JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
            LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
        """
        
        if resourceid is not None:
            query = base_query + " WHERE pv.var_id = %s"
            params = (resourceid,)
        else:
            product = request.args.get('product')
            if product:
                query = base_query + " WHERE pv.prod_id = %s"
                params = (product,)
            else:
                query = base_query
                params = None

        query_results = execute_select_query(query, params)

        variations = {}
        for row in query_results:
            var_id = row['var_id']
            if var_id not in variations:
                variation = {
                    'var_id': var_id,
                    'prod_id': row['prod_id'],
                    'var_name': row['var_name'],
                    'var_inv': row['var_inv'],
                    'var_goal': row['var_goal'],
                    'img_id': row['img_id'],
                    'materials': []
                }
                variations[var_id] = variation
            if row['mat_id']:
                material = {
                    'mat_id': row['mat_id'],
                    'mat_name': row['mat_name'],
                    'mat_sku': row['mat_sku'],
                    'mat_inv': row['mat_inv'],
                    'mat_amount': row['mat_amount'],
                    'brand_name': row['brand_name'],
                    'mc_name': row['mc_name'],
                    'meas_unit': row['meas_unit']
                }
                variations[var_id]['materials'].append(material)
        
        variation_list = list(variations.values())
        if resourceid is not None:
            if not variation_list:
                return make_response(jsonify({"error": "Resource not found"}), 404)
            return make_response(jsonify(variation_list[0]), 200)
        else:
            return make_response(jsonify(variation_list), 200)
        
    except Exception as e:
        logger.error(f"Error in productvariationsGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/productvariations', methods=['POST'])
def productvariationsPost():
    request_data = request.get_json()
    try:
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
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in productvariationsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)


@app.route('/api/productvariations/<int:resourceid>', methods=['PUT', 'PATCH'])
def productvariationsEdit(resourceid=None):
    request_data = request.get_json()
    try:
        # Perform database operations
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT var_inv FROM frostedfabrics.product_variations WHERE var_id = %s", (resourceid,))
            current_variation = cursor.fetchone()
            if not current_variation:
                return make_response(jsonify({"error": "Variation not found"}), 404)

            current_inv = current_variation['var_inv']
            new_inv = request_data.get('var_inv', current_inv)
            inv_difference = new_inv - current_inv

            # Update the variation
            update_fields = ['var_name', 'var_inv', 'var_goal', 'img_id']
            update_data = {k: request_data.get(k) for k in update_fields if k in request_data}
            if update_data:
                update_query = "UPDATE frostedfabrics.product_variations SET "
                update_query += ", ".join(f"{k} = %s" for k in update_data.keys())
                update_query += " WHERE var_id = %s"
                cursor.execute(update_query, list(update_data.values()) + [resourceid])

            # Handle material inventory updates if inventory is increased
            if inv_difference > 0:
                material_query = """
                    SELECT vm.mat_id, vm.mat_amount, m.mat_inv
                    FROM frostedfabrics.variation_materials vm
                    JOIN frostedfabrics.materials m ON vm.mat_id = m.mat_id
                    WHERE vm.var_id = %s
                """
                cursor.execute(material_query, (resourceid,))
                materials = cursor.fetchall()

                material_updates = []
                for material in materials:
                    new_mat_inv = material['mat_inv'] - (material['mat_amount'] * inv_difference)
                    if new_mat_inv < 0:
                        return make_response(jsonify({
                            "error": "Insufficient material inventory",
                            "material_id": material['mat_id']
                        }), 400)
                    material_updates.append((new_mat_inv, material['mat_id']))

                if material_updates:
                    cursor.executemany(
                        "UPDATE frostedfabrics.materials SET mat_inv = %s WHERE mat_id = %s",
                        material_updates
                    )

            conn.commit()
        # Connection is now closed; safe to call productvariationsGet
        return productvariationsGet(resourceid=resourceid)

    except Exception as e:
        logger.error(f"Error in productvariationsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)


@app.route('/api/productvariations/<int:resourceid>', methods=['DELETE'])
def productvariationsDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.product_variations WHERE var_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productvariationsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== PRODUCT CATEGORIES METHODS ============
@app.route('/api/productcategories', methods=['GET'])
@app.route('/api/productcategories/<int:resourceid>', methods=['GET'])
def productcategoriesGet(resourceid=None):
    try:
        if resourceid is not None:
            query = "SELECT * FROM frostedfabrics.product_categories WHERE pc_id = %s"
            params = (resourceid,)
        else:
            query = "SELECT * FROM frostedfabrics.product_categories"
            params = None

        query_results = execute_select_query(query, params)

        if resourceid is not None:
            if not query_results:
                return make_response(jsonify({"error": "Resource not found"}), 404)
            return make_response(jsonify(query_results[0]), 200)
        else:
            return make_response(jsonify(query_results), 200)

    except Exception as e:
        logger.error(f"Error in productcategoriesGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/productcategories', methods=['POST'])
def productcategoriesPost():
    request_data = request.get_json()
    try:
        query = """
        INSERT INTO frostedfabrics.product_categories (pc_name, img_id)
        VALUES (%s, %s)
        """
        params = (request_data['pc_name'], request_data['img_id'])
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in productcategoriesPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/productcategories/<int:resourceid>', methods=['PUT', 'PATCH'])
def productcategoriesEdit(resourceid=None):
    request_data = request.get_json()
    try:
        update_fields = ['pc_name', 'img_id']
        params = []
        query = "UPDATE frostedfabrics.product_categories SET "
        query += ", ".join(f"{field} = %s" for field in update_fields if field in request_data)
        params = [request_data[field] for field in update_fields if field in request_data]
        query += " WHERE pc_id = %s"
        params.append(resourceid)
        execute_write_query(query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/productcategories/<int:resourceid>', methods=['DELETE'])
def productcategoriesDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.product_categories WHERE pc_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in productcategoriesDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== MATERIAL CATEGORIES METHODS ============
@app.route('/api/materialcategories', methods=['GET'])
@app.route('/api/materialcategories/<int:resourceid>', methods=['GET'])
def materialcategoriesGet(resourceid=None):
    try:
        if resourceid is not None:
            query = """
                SELECT mc.*, mm.meas_unit
                FROM frostedfabrics.material_categories mc
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
                WHERE mc.mc_id = %s
            """
            params = (resourceid,)
        else:
            query = """
                SELECT mc.*, mm.meas_unit
                FROM frostedfabrics.material_categories mc
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            """
            params = None

        query_results = execute_select_query(query, params)

        if resourceid is not None:
            if not query_results:
                return make_response(jsonify({"error": "Resource not found"}), 404)
            return make_response(jsonify(query_results[0]), 200)
        else:
            return make_response(jsonify(query_results), 200)

    except Exception as e:
        logger.error(f"Error in materialcategoriesGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialcategories', methods=['POST'])
def materialcategoriesPost():
    request_data = request.get_json()
    try:
        query = """
        INSERT INTO frostedfabrics.material_categories (meas_id, mc_name, img_id)
        VALUES (%s, %s, %s)
        """
        params = (request_data['meas_id'], request_data['mc_name'], request_data['img_id'])
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in materialcategoriesPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialcategories/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialcategoriesEdit(resourceid=None):
    request_data = request.get_json()
    try:
        update_fields = ['meas_id', 'mc_name', 'img_id']
        params = []
        query = "UPDATE frostedfabrics.material_categories SET "
        query += ", ".join(f"{field} = %s" for field in update_fields if field in request_data)
        params = [request_data[field] for field in update_fields if field in request_data]
        query += " WHERE mc_id = %s"
        params.append(resourceid)
        execute_write_query(query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialcategories/<int:resourceid>', methods=['DELETE'])
def materialcategoriesDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.material_categories WHERE mc_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialcategoriesDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== MATERIAL BRANDS METHODS ============
@app.route('/api/materialbrands', methods=['GET'])
@app.route('/api/materialbrands/<int:resourceid>', methods=['GET'])
def materialbrandsGet(resourceid=None):
    try:
        if resourceid is not None:
            query = """
                SELECT mb.*, mc.mc_name
                FROM frostedfabrics.material_brands mb
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                WHERE mb.brand_id = %s
            """
            params = (resourceid,)
        else:
            query = """
                SELECT mb.*, mc.mc_name
                FROM frostedfabrics.material_brands mb
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
            """
            params = None

        query_results = execute_select_query(query, params)

        if resourceid is not None:
            if not query_results:
                return make_response(jsonify({"error": "Resource not found"}), 404)
            return make_response(jsonify(query_results[0]), 200)
        else:
            return make_response(jsonify(query_results), 200)

    except Exception as e:
        logger.error(f"Error in materialbrandsGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialbrands', methods=['POST'])
def materialbrandsPost():
    request_data = request.get_json()
    try:
        query = """
        INSERT INTO frostedfabrics.material_brands (mc_id, brand_name, brand_price, img_id)
        VALUES (%s, %s, %s, %s)
        """
        params = (request_data['mc_id'], request_data['brand_name'], request_data['brand_price'], request_data['img_id'])
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in materialbrandsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialbrands/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialbrandsEdit(resourceid=None):
    request_data = request.get_json()
    try:
        update_fields = ['mc_id', 'brand_name', 'brand_price', 'img_id']
        params = []
        query = "UPDATE frostedfabrics.material_brands SET "
        query += ", ".join(f"{field} = %s" for field in update_fields if field in request_data)
        params = [request_data[field] for field in update_fields if field in request_data]
        query += " WHERE brand_id = %s"
        params.append(resourceid)
        execute_write_query(query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materialbrands/<int:resourceid>', methods=['DELETE'])
def materialbrandsDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.material_brands WHERE brand_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialbrandsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== MATERIALS METHODS ============
@app.route('/api/materials', methods=['GET'])
@app.route('/api/materials/<int:resourceid>', methods=['GET'])
def materialsGet(resourceid=None):
    try:
        if resourceid is not None:
            query = """
                SELECT m.*, mb.brand_name, mc.mc_name, mm.meas_unit
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
                SELECT m.*, mb.brand_name, mc.mc_name, mm.meas_unit
                FROM frostedfabrics.materials m
                JOIN frostedfabrics.material_brands mb ON m.brand_id = mb.brand_id
                JOIN frostedfabrics.material_categories mc ON mb.mc_id = mc.mc_id
                LEFT JOIN frostedfabrics.material_measurements mm ON mc.meas_id = mm.meas_id
            """
            params = None
            if category:
                query += " WHERE mc.mc_name = %s"
                params = (category,)

        query_results = execute_select_query(query, params)

        if resourceid is not None:
            if not query_results:
                return make_response(jsonify({"error": "Resource not found"}), 404)
            return make_response(jsonify(query_results[0]), 200)
        else:
            return make_response(jsonify(query_results), 200)

    except Exception as e:
        logger.error(f"Error in materialsGet: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materials', methods=['POST'])
def materialsPost():
    request_data = request.get_json()
    try:
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
        execute_write_query(query, params)
        return make_response("", 201)
    except Exception as e:
        logger.error(f"Error in materialsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materials/<int:resourceid>', methods=['PUT', 'PATCH'])
def materialsEdit(resourceid=None):
    request_data = request.get_json()
    try:
        update_fields = ['brand_id', 'mat_name', 'mat_sku', 'mat_inv', 'mat_alert', 'img_id']
        params = []
        query = "UPDATE frostedfabrics.materials SET "
        query += ", ".join(f"{field} = %s" for field in update_fields if field in request_data)
        params = [request_data[field] for field in update_fields if field in request_data]
        query += " WHERE mat_id = %s"
        params.append(resourceid)
        execute_write_query(query, tuple(params))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/materials/<int:resourceid>', methods=['DELETE'])
def materialsDelete(resourceid=None):
    try:
        query = "DELETE FROM frostedfabrics.materials WHERE mat_id = %s"
        execute_write_query(query, (resourceid,))
        return make_response("", 200)
    except Exception as e:
        logger.error(f"Error in materialsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

# ============== VARIATION MATERIALS METHODS ============
@app.route('/api/variationmaterials', methods=['GET'])
@app.route('/api/variationmaterials/<int:resourceid>', methods=['GET'])
def variationmaterialsGet(resourceid=None):
    try:
        if resourceid is not None:
            query = """
                SELECT 
                    vm.var_id,
                    vm.mat_id,
                    vm.mat_amount,
                    m.mat_name,
                    m.mat_sku,
                    m.mat_inv,
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
                    m.mat_inv,
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

        query_results = execute_select_query(query, params)

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

@app.route('/api/variationmaterials', methods=['POST'])
def variationmaterialsPost():
    request_data = request.get_json()
    try:
        # Validate that the variation and material exist
        validation_query = """
            SELECT EXISTS(SELECT 1 FROM frostedfabrics.product_variations WHERE var_id = %s) AS var_exists,
                   EXISTS(SELECT 1 FROM frostedfabrics.materials WHERE mat_id = %s) AS mat_exists
        """
        validation = execute_select_query(validation_query, (request_data['var_id'], request_data['mat_id']))

        if not validation[0]['var_exists'] or not validation[0]['mat_exists']:
            return make_response(jsonify({"error": "Invalid variation or material ID"}), 400)

        # Upsert the variation material
        upsert_query = """
            INSERT INTO frostedfabrics.variation_materials (var_id, mat_id, mat_amount)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE mat_amount = VALUES(mat_amount)
        """
        execute_write_query(upsert_query, (
            request_data['var_id'],
            request_data['mat_id'],
            request_data['mat_amount']
        ))

        # Fetch and return updated variation materials
        return variationmaterialsGet(resourceid=request_data['var_id'])

    except Exception as e:
        logger.error(f"Error in variationmaterialsPost: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/variationmaterials/<int:var_id>/<int:mat_id>', methods=['PUT', 'PATCH'])
def variationmaterialsEdit(var_id, mat_id):
    request_data = request.get_json()
    try:
        update_query = """
            UPDATE frostedfabrics.variation_materials
            SET mat_amount = %s
            WHERE var_id = %s AND mat_id = %s
        """
        rowcount = execute_write_query(update_query, (request_data['mat_amount'], var_id, mat_id))

        if rowcount == 0:
            return make_response(jsonify({"error": "Material not found for this variation"}), 404)

        # Fetch and return updated variation materials
        return variationmaterialsGet(resourceid=var_id)

    except Exception as e:
        logger.error(f"Error in variationmaterialsEdit: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

@app.route('/api/variationmaterials/<int:var_id>/<int:mat_id>', methods=['DELETE'])
def variationmaterialsDelete(var_id, mat_id):
    try:
        delete_query = """
            DELETE FROM frostedfabrics.variation_materials
            WHERE var_id = %s AND mat_id = %s
        """
        rowcount = execute_write_query(delete_query, (var_id, mat_id))

        if rowcount == 0:
            return make_response(jsonify({"error": "Material not found for this variation"}), 404)

        # Fetch and return updated variation materials
        return variationmaterialsGet(resourceid=var_id)

    except Exception as e:
        logger.error(f"Error in variationmaterialsDelete: {str(e)}")
        return make_response(jsonify({"error": "Internal Server Error", "details": str(e)}), 500)

if __name__ == '__main__':
    app.run(threaded=True)
