const express = require('express');
const authRoutes = require('./modules/auth/index');
const oauthRoutes = require('./modules/oauth')

const router = express.Router();

// pindahkan keatas, agar yg ada endpoint /oauth diprioritaskan untuk di call
router.use('/auth/oauth', oauthRoutes);

router.use('/auth', authRoutes);



module.exports = router;
