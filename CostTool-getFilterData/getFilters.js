const runQuery = async(pool, query) => {
    return await new Promise((resolve, reject) => {
        pool.query(query, (error, results) => {
            if (error) {
                reject(error)
            } else {
                resolve(results)
            }
        })
    });
};

const getFilters = async(pool, error_handler, callback) =>{
    /// BUILD RESPONSE JSON OBJ - TODO - USE ORM?
    // test1

    let returnJSON = {};
    let query;

    // APP AND DB VERSIONS
    query = 'select * FROM `System`';
    returnJSON.versions = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // ORIGIN PORTS
    query = 'select Origins.OriginName AS "name", Origins.ID AS "id" FROM `Origins` ORDER BY `ID` ASC';
    returnJSON.origins = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // DESTINATION PORTS
    query = 'select Destinations.DestinationName AS "name", Destinations.ID AS "id" FROM `Destinations` ORDER BY `ID` ASC';
    returnJSON.destinations = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // TRADELANE NAMES
    query = 'select TradeLaneTitles.TradeLaneTitle AS "name", TradeLaneTitles.ID AS "id" FROM `TradeLaneTitles` ORDER BY `TradeLaneTitle` ASC';
    returnJSON.tradelaneNames = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // TRADELANES
    query = 'select TradeLaneNameID, OriginID, DestinationID, TradeDirection FROM `TradeLanes` ORDER BY `TradeLaneNameID` ASC';
    returnJSON.tradelanes = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // EQUIPMENT
    query = 'select Equipment.EquipmentName AS "name", Equipment.ID AS "id" FROM `Equipment` ORDER BY `EquipmentName` ASC';
    returnJSON.equipment = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });

    // SERVICES
    query = 'select Services.ServiceName AS "name", Services.ID AS "id" FROM `Services` ORDER BY `ServiceName` ASC';
    returnJSON.services = await runQuery(pool, query).catch(err => {
        console.log(query, err);
        error_handler(callback, 'query: '+ query +' :: ' + err);
    });


    return returnJSON;

};

module.exports = { getFilters }
