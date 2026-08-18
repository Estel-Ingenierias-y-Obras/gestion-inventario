const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const {
  listMaterialOrders, listDepletedMaterialOrders, listStockCatalog,
  createMaterialOrder, updateMaterialOrder, markMaterialOrderReceived, deleteMaterialOrder,
} = require('../controllers/materialOrderController');
const {
  createMaterialOrderValidator, materialOrderIdValidator, updateMaterialOrderValidator,
} = require('../validators/materialOrderValidators');

const router = express.Router();

router.use(authenticate, requireWhitelist);
router.get('/', listMaterialOrders);
router.get('/history', listDepletedMaterialOrders);
router.get('/catalog', listStockCatalog);
router.post('/', createMaterialOrderValidator, validateRequest, createMaterialOrder);
router.put('/:id', updateMaterialOrderValidator, validateRequest, updateMaterialOrder);
router.patch('/:id/received', materialOrderIdValidator, validateRequest, markMaterialOrderReceived);
router.delete('/:id', requireAdmin, materialOrderIdValidator, validateRequest, deleteMaterialOrder);

module.exports = router;
