const dryEquip = [1,2,3];
const referEquip = [4,5];

const getAllEquipmentCostsByBreakDownID = (
    rawCostData,
    costGroupID,
    breakdownID
) => {

    let costArr = [];

    for (let r in rawCostData) {
        const data = rawCostData[r];
        if (data.CostGroupID === costGroupID && data.BreakdownID === breakdownID) {
            costArr.push({
                equipmentName: data.EquipmentName,
                equipmentId: data.ID,
                costDate: data.Date,
                cost: data.Cost,
                alert: false
            });
        }
    }

    return costArr;
};

function differenceInMonths(date1, date2) {
    const monthDiff = date1.getMonth() - date2.getMonth();
    const yearDiff = date1.getYear() - date2.getYear();

    return (monthDiff + yearDiff * 12) * -1;
}

const getCostData = async (
    pool, {
        startDate,
        endDate,
        equipType,
        tradelane,
        service,
        origin,
        destination,
        costType
    },error_handler, callback
) => {

    const foundDry = dryEquip.filter(element => equipType.includes(element));
    const foundRefer = referEquip.filter(element => equipType.includes(element));
    const containerQueryType = foundDry.length && foundRefer.length ? "both" :  (foundDry.length ? "dry" : "refer")


    let returnJSON = {
        equipmentTypes: [],
        costData: [],
        timeRangeLabels: [],
        costGroups: [],
        message: ''
    };


    // GET LIST OF QUERY RULES THAT  WE'LL BE USING BASED ON FILTER PARAMS
    // Test
    //Test2
    // testing the script to check the folder Diff
    // test 4
    // test 5
    // test 6
    // test 11
    //test 14

    let filterIDArrayDRY, filterIDArrayREFER = [];
    if(foundDry.length){
        const filterRuleDRYQuery = `SELECT FilterRules.BreakdownItemsID 
         FROM TradeLanes INNER JOIN FilterRules ON TradeLanes.DRYFilterID =  FilterRules.ID 
         WHERE TradeLanes.OriginID = ${origin} AND TradeLanes.DestinationID = ${destination}`;

        filterIDArrayDRY = await new Promise((resolve) => {
            pool.query(filterRuleDRYQuery, (error, results) => {
                if (error) {
                    console.log(filterRuleDRYQuery, error);
                    error_handler(callback, 'query: '+ filterRuleDRYQuery +' :: ' + error);
                } else {
                    resolve(results);
                }
            });
        });

        filterIDArrayDRY = filterIDArrayDRY[0].BreakdownItemsID;

        // if no filters exist for this route, return message
        if(filterIDArrayDRY.length < 1) {
            console.log('error -> No results were found for your query. Please try again.: QueryID: Filter 1');
            error_handler(callback, 'No results were found for your query. Please try again.: QueryID: Filter 1');
        }
    }


    // GET SECOND SET OF FILTERS FOR DRY VS REFER
    if(foundRefer.length){
        const filterRuleREFERQuery = `SELECT FilterRules.BreakdownItemsID 
         FROM TradeLanes INNER JOIN FilterRules ON TradeLanes.REFERFilterID =  FilterRules.ID 
         WHERE TradeLanes.OriginID = ${origin} AND TradeLanes.DestinationID = ${destination}`;

        filterIDArrayREFER = await new Promise((resolve) => {
            pool.query(filterRuleREFERQuery, (error, results) => {
                if (error) {
                    console.log(filterRuleREFERQuery, error);
                    error_handler(callback, 'query: '+ filterRuleREFERQuery +' :: ' + error);
                } else {
                    resolve(results);
                }
            });
        });

        filterIDArrayREFER = filterIDArrayREFER[0].BreakdownItemsID;

        // if no filters exist for this route, return message
        if(filterIDArrayREFER.length < 1) {
            const message = 'No results were found for your query. Please try again. QueryID: Filter 2'
            console.log(message);
            error_handler(message);
        }
    }

    let filterIDArrayCOMBINED = [];
    if(filterIDArrayDRY?.length && filterIDArrayREFER?.length) {
        filterIDArrayCOMBINED = [...new Set([...filterIDArrayDRY.split(","), ...filterIDArrayREFER.split(",")])];
    } else {
        filterIDArrayCOMBINED = filterIDArrayDRY?.length ? filterIDArrayDRY.split(",") : filterIDArrayREFER.split(",")
    }


    // TIME RANGE LABELS
    const timeQuery = `SELECT 
                        DISTINCT b.Date
                        FROM Equipment AS a INNER JOIN Costs as b 
                        ON a.ID = b.EquipmentID
                        INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                        INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                        WHERE b.Date between '${startDate}' and '${endDate}'
                        AND
                        a.ID IN (${equipType})
                        AND b.BreakdownID IN (${filterIDArrayCOMBINED})
                        ORDER BY date ASC`

    const timeQueryArray = await new Promise((resolve) => {
        pool.query(timeQuery, (error, results) => {
            if (error) {
                console.log(timeQuery, error);
                error_handler(callback, 'query: '+ timeQuery +' :: ' + error);
            } else {
                resolve(results);
            }
        });
    });

    // if time query data exist for this route, return message
    if(timeQueryArray.length < 1) {
        const message = 'No results were found for your query. Please try again.: QueryID: TimeQuery';
        console.log(message);
        error_handler(message);
    }


    let timeLabels = [];
    let i = 0;

    do {
        timeLabels.push(new Date(timeQueryArray[i].Date));
        i++;
    } while (i < timeQueryArray.length);

    returnJSON.timeRangeLabels = timeLabels;

    let sDate = new Date(timeLabels[0]);
    let eDate = new Date(timeLabels[timeLabels.length-1]);
    const timeDiff = differenceInMonths(sDate, eDate);






    // COST GROUPS
    // COST GROUPS_new
    // COST 
    //COST
    // COST 1
    
    let costGroupsQuery;
    if(costType){
        costGroupsQuery = `SELECT distinct(a.ID) AS  costGroupId, a.GroupName AS  costGroupName
                            FROM CostGroups AS a INNER JOIN BreakdownItems AS b
                            ON a.ID = b.CostGroupID
                            WHERE b.CostTypeID = ${costType}`;
    } else {
        costGroupsQuery = `SELECT ID AS costGroupId, GroupName AS  costGroupName FROM CostGroups`;
    }

    let costGroupsArray = await new Promise((resolve) => {
        pool.query(costGroupsQuery, (error, results) => {
            if (error) {
                console.log(costGroupsQuery, error);
                error_handler(callback, 'query: '+ costGroupsQuery +' :: ' + error);
            } else {
                resolve(results);
            }
        });
    });

    // if no filters exist for this route, return message
    if(costGroupsArray.length < 1) {
        const message = 'No results were found for your query. Please try again.: QueryID: Cost Groups';
        console.log(message);
        error_handler(message);
    }

    returnJSON.costGroups = costGroupsArray;








    // COST DETAILS

    //  RUN UNIQUE QUERIES ON FILTER IDS PER CONTAINER TYPE,
    //  PATCHING TOGETHER
    //  MULTIPLE QUERIES TO ACCOMMODATE UNIQUE FILTER IDS PER CONTAINER TYPE


    let costQuery = `SELECT ID,a.EquipmentName,EquipmentID,BreakdownID,Date,Cost,BreakdownName,CostTypeID,CostGroupID,GroupName,Threshold FROM (`;
    if(foundDry.length) {
        costQuery += `SELECT a.ID, a.EquipmentName, 
                            b.EquipmentID,
                            b.BreakdownID,
                            b.Date,
                            b.Cost, 
                            BreakdownItems.BreakdownName,
                            BreakdownItems.CostTypeID,
                            BreakdownItems.Threshold,
                            CostGroups.ID AS CostGroupID,
                            CostGroups.GroupName 
                            FROM Equipment AS a INNER JOIN Costs as b 
                            ON a.ID = b.EquipmentID
                            INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                            INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                            WHERE b.Date between '${startDate}' and '${endDate}'
                            AND
                            a.ID IN (${foundDry})
                            AND b.BreakdownID IN (${containerQueryType === 'both' ? filterIDArrayCOMBINED : filterIDArrayDRY})`;

        if(costType)  costQuery += `AND BreakdownItems.CostTypeID = ${costType}`;
    }

    if(foundDry.length && foundRefer.length){ costQuery += ` UNION ALL `;}

    if(foundRefer.length){
        costQuery += `SELECT a.ID, a.EquipmentName, 
                            b.EquipmentID,
                            b.BreakdownID,
                            b.Date,
                            b.Cost, 
                            BreakdownItems.BreakdownName,
                            BreakdownItems.CostTypeID,
                            BreakdownItems.Threshold,
                            CostGroups.ID AS CostGroupID,
                            CostGroups.GroupName 
                            FROM Equipment AS a INNER JOIN Costs as b 
                            ON a.ID = b.EquipmentID
                            INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                            INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                            WHERE b.Date between '${startDate}' and '${endDate}'
                            AND
                            a.ID IN (${foundRefer})
                            AND b.BreakdownID IN (${containerQueryType === 'both' ? filterIDArrayCOMBINED : filterIDArrayREFER})`;
        if(costType)  costQuery += `AND BreakdownItems.CostTypeID = ${costType}`;
    }

    costQuery += `) a `;

    costQuery += `ORDER BY CostGroupID ASC, BreakdownID ASC, ID ASC, DATE ASC;`;

    console.log("cost query>>>>>>>>>>>>  ",costQuery);

    const rawCostData = await new Promise((resolve) => {
        pool.query(costQuery, (error, results) => {
            if (error) {
                console.log(costQuery, error);
                error_handler(callback, 'query: '+ costQuery +' :: ' + error);
            } else {
                resolve(results);
            }
        });
    });

    // if cost data exist for this route, return message
    if(rawCostData.length < 1) {
        const message = 'No results were found for your query. Please try again. QueryID: Cost Details';
        console.log(message);
        error_handler(message);
    }

    // begin running filters and reducers to create our final JSON object

    let op = rawCostData.reduce((o, c) => {

        if (o[c.CostGroupID]) {
            if (!o[c.CostGroupID]?.breakdownItems.find((o) => o.breakdownId === c.BreakdownID)) {
                o[c.CostGroupID].breakdownItems.push({
                    breakdownName: c.BreakdownName,
                    breakdownId: c.BreakdownID,
                    costType: c.CostTypeID,
                    threshold: c.Threshold,
                    equipmentCosts: {},
                });
            }
        } else {
            let {
                GroupName,
                BreakdownName,
                BreakdownID,
                CostGroupID,
                CostTypeID,
                Threshold
            } = c;

            o[c.CostGroupID] = {
                costGroupName: GroupName,
                costGroupId: CostGroupID,
                breakdownItems: [{
                    breakdownName: BreakdownName,
                    breakdownId: BreakdownID,
                    costType: CostTypeID,
                    threshold: Threshold,
                    equipmentCosts: {},
                }, ],
            };
        }
        return o;
    }, {});

    let costFoundation = Object.values(op);
    costFoundation.map((costGroup) => {
        costGroup.breakdownItems.map((a) => {
            const costArr = getAllEquipmentCostsByBreakDownID(
                rawCostData,
                costGroup.costGroupId,
                a.breakdownId,
                timeLabels,
                timeDiff,
            );
            a.equipmentCosts = costArr;
        });
    });


    // for now, we add cost groups that do not return data from the query above

    let costData = Object.values(costFoundation);

    returnJSON.costData = costData;





    // EQUIPMENT DETAILS

    let mymap = new Map();

    let equipArr = rawCostData
        .filter((el) => {
            const val = mymap.get(el.EquipmentName);
            if (val) {
                if (el.EquipmentID < val) {
                    mymap.delete(el.EquipmentName);
                    mymap.set(el.EquipmentName, el.EquipmentID);
                    return true;
                } else {
                    return false;
                }
            }
            mymap.set(el.EquipmentName, el.EquipmentID);
            return true;
        })
        .map((el) => {
            return {
                equipmentName: el.EquipmentName,
                equipmentId: el.EquipmentID
            };
        });

    for (let n in equipArr) {
        const id = equipArr[n].equipmentId;
        let fixedQuery = `SELECT a.ID, a.EquipmentName, 
                                b.EquipmentID,
                                b.BreakdownID,
                                b.Date,
                                SUM(b.Cost) AS cost, 
                                BreakdownItems.BreakdownName,
                                CostGroups.ID AS CostGroupID,
                                CostGroups.GroupName 
                                FROM Equipment AS a INNER JOIN Costs as b 
                                ON a.ID = b.EquipmentID
                                INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                                INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                                WHERE b.Date between '${startDate}' and '${endDate}'
                                AND BreakdownItems.CostTypeID = 1
                                AND a.ID=${id}
                                AND b.BreakdownID IN (${filterIDArrayCOMBINED})
                                ORDER BY CostGroupID ASC, b.BreakdownID ASC, ID ASC, b.DATE ASC`;

        let fixedTotals = await new Promise((resolve) => {
            pool.query(fixedQuery, (error, results) => {
                if (error) {
                    console.log(fixedQuery, error);
                    error_handler(callback, 'query: '+ fixedQuery +' :: ' + error);
                } else {
                    resolve(results);
                }
            });
        });
        equipArr[n].fixedCosts = fixedTotals[0].cost/(timeDiff+1) ;

        let variableQuery = `SELECT a.ID, a.EquipmentName, 
                                b.EquipmentID,
                                b.BreakdownID,
                                b.Date,
                                SUM(b.Cost) AS cost, 
                                BreakdownItems.BreakdownName,
                                CostGroups.ID AS CostGroupID,
                                CostGroups.GroupName 
                                FROM Equipment AS a INNER JOIN Costs as b 
                                ON a.ID = b.EquipmentID
                                INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                                INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                                WHERE b.Date between '${startDate}' and '${endDate}'
                                AND BreakdownItems.CostTypeID = 2
                                AND a.ID=${id}
                                AND b.BreakdownID IN (${filterIDArrayCOMBINED})
                                ORDER BY CostGroupID ASC, b.BreakdownID ASC, ID ASC, b.DATE ASC`;

        let variableTotals = await new Promise((resolve) => {
            pool.query(variableQuery, (error, results) => {
                if (error) {
                    console.log(variableQuery, error);
                    error_handler(callback, 'query: '+ variableQuery +' :: ' + error);
                } else {
                    resolve(results);
                }
            });
        });
        equipArr[n].variableCosts = variableTotals[0].cost/(timeDiff+1) ;
        equipArr[n].costSummary = equipArr[n].fixedCosts + equipArr[n].variableCosts ;
    }

    // if cost data exist for this route, return message
    if(equipArr.length < 1) {
        const message = 'No results were found for your query. Please try again. QueryID: Equip Types';
        console.log(message);
        error_handler(message);
    }

    returnJSON.equipmentTypes = equipArr;




    // TOTALS BY COSTGROUP
    // return the sum of cost group data by date for each equipment type

    let cgQuery = `SELECT a.ID AS equipmentId,
                    b.Date AS date,
                    SUM(b.Cost) AS cost, 
                    CostGroups.ID AS costGroupId
                    FROM Equipment AS a INNER JOIN Costs as b 
                    ON a.ID = b.EquipmentID
                    INNER JOIN BreakdownItems ON b.BreakdownID = BreakdownItems.ID
                    INNER JOIN CostGroups ON BreakdownItems.CostGroupID = CostGroups.ID
                    WHERE b.Date between '${startDate}' and '${endDate}'
                    AND a.ID IN (${equipType})
                    AND b.BreakdownID IN (${filterIDArrayCOMBINED})`;

    if(costType) cgQuery += `AND BreakdownItems.CostTypeID = ${costType} `;

    cgQuery +=  `   GROUP by equipmentId, date, costGroupId
                    ORDER by equipmentId ASC, date ASC, costGroupId ASC;`;


    const totalsByCostGroup = await new Promise((resolve) => {
        pool.query(cgQuery, (error, results) => {
            if (error) {
                console.log(cgQuery, error);
                error_handler(callback, 'query: '+ cgQuery +' :: ' + error);
            } else {
                resolve(results);
            }
        });
    });

    // if cost summary data exist for this route, return message
    if(totalsByCostGroup.length < 1) {
        const message = 'No results were found for your query. Please try again. QueryID: Cost Summary';
        console.log(message);
        error_handler(message);
    }

    returnJSON.equipmentCostSummary = totalsByCostGroup;




    // TOTALS BY DATE AND EQUIPMENT PER COSTGROUP
    // return the sum of cost group data by date for each equipment type

    let totalsByDateAndCostGroup=[];

    for(const i in equipType) {
        const arrayOfEquipCosts = totalsByCostGroup.filter(item => {
            return item.equipmentId == equipType[i];
        });
        const reducedData = arrayOfEquipCosts.reduce((acc, cur) => {
            const {date, cost, equipmentId} = cur;
            const item = acc.find(it => it.date.toString() === date.toString());
            item ? item.cost += cost : acc.push({equipmentId, date, cost});
            return acc;
        } , []);

        if(reducedData.length) totalsByDateAndCostGroup.push(reducedData);
    }


    returnJSON.equipmentDateCostSummary = totalsByDateAndCostGroup.flat(2);



    // FIND DEVIATIONS IN THRESHOLD VALUES FOR COSTS
    let thresholdAlertArr = [];

    returnJSON.costData.map(costGroup=>{
        const { costGroupId } = costGroup
        costGroup.breakdownItems.map(bdItem=>{
            const {threshold, equipmentCosts} = bdItem;

            // loop through equipmentCosts and compare cost to threshold
            equipmentCosts.map((costItm,index) => {
                // void zeros we enter for dual equipment type queries
                let isDualEquip = false;
                if(index>0) isDualEquip = costItm.cost === 0 || equipmentCosts[index-1].cost === 0;

                if(!isDualEquip && index > 0 && threshold > 0
                    && (
                        (Math.abs(equipmentCosts[index-1].cost) * threshold) < Math.abs(Math.abs(costItm.cost) - Math.abs(equipmentCosts[index-1].cost))
                    )
                ){
                    costItm.alert=true;
                    thresholdAlertArr.push({equipmentId: costItm.equipmentId, date: costItm.costDate, costGroupId: costGroupId});
                }
            })
        })
    });


    returnJSON.equipmentCostSummary.map(equipItem => {
        equipItem.alert = thresholdAlertArr.some(y => y.equipmentId === equipItem.equipmentId && y.date.toString() === equipItem.date.toString() && y.costGroupId === equipItem.costGroupId);
    });

    returnJSON.equipmentDateCostSummary.map(equipItem => {
        equipItem.alert = thresholdAlertArr.some(y => y.equipmentId === equipItem.equipmentId && y.date.toString() === equipItem.date.toString());
    });

    return returnJSON;
};


module.exports = {
    getCostData
};