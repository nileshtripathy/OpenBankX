import { Router } from 'express';
import authRoutes from './auth.routes';
import walletRoutes from './wallet.routes';
import bankRoutes from './bank.routes';
import blockchainRoutes from './blockchain.routes';
// Future modules mount here as they're built:
// import walletBalanceRoutes from './balance.routes';
// import swapRoutes from './swap.routes';
// import transactionRoutes from './transaction.routes';
// import adminRoutes from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OpenBankX API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/bank', bankRoutes);
router.use('/blockchain', blockchainRoutes);
// router.use('/balances', walletBalanceRoutes);
// router.use('/swap', swapRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/admin', adminRoutes);

export default router;
