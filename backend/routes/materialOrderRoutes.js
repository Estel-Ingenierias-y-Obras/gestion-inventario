const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const {
  listMaterialOrders, listDepletedMaterialOrders, listStockCatalog,
  createMaterialOrder, markMaterialOrderReceived,
} = require('../controllers/materialOrderController');
const { createMaterialOrderValidator, materialOrderIdValidator } = require('../validators/materialOrderValidators');

const router = express.Router();

router.use(authenticate, requireWhitelist);
router.get('/', listMaterialOrders);
router.get('/history', listDepletedMaterialOrders);
router.get('/catalog', listStockCatalog);
router.post('/', createMaterialOrderValidator, validateRequest, createMaterialOrder);
router.patch('/:id/received', materialOrderIdValidator, validateRequest, markMaterialOrderReceived);

module.exports = router;
