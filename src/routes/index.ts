// Route aggregator — all modules under /api/v1
import { Router } from 'express';
import { clientsRouter     } from './clients';
import { paymentsRouter    } from './payments';
import { journalsRouter    } from './journals';
import { reportsRouter     } from './reports';
import { ibRouter          } from './ib';
import { usersRouter       } from './users';
import { eodRouter         } from './eod';
import { tradesRouter      } from './trades';
import { mt5AccountsRouter } from './mt5-accounts';
import { symbolsRouter     } from './symbols';
import { coaRouter         } from './chart-of-accounts';
// New modules
import { branchesRouter       } from './branches';
import { walletsRouter        } from './wallets';
import { treasuryRouter       } from './treasury';
import { documentsRouter      } from './documents';
import { crmRouter            } from './crm';
import { hrRouter             } from './hr';
import { assetsRouter         } from './assets';
import { ownershipRouter      } from './ownership';
import { notificationsRouter  } from './notifications';
import { workflowsRouter      } from './workflows';
import { riskRouter           } from './risk';

export const apiRouter = Router();

// Core modules
apiRouter.use('/clients',            clientsRouter);
apiRouter.use('/payments',           paymentsRouter);
apiRouter.use('/journals',           journalsRouter);
apiRouter.use('/reports',            reportsRouter);
apiRouter.use('/ib-commissions',     ibRouter);
apiRouter.use('/users',              usersRouter);
apiRouter.use('/eod',                eodRouter);
apiRouter.use('/trades',             tradesRouter);
apiRouter.use('/mt5-accounts',       mt5AccountsRouter);
apiRouter.use('/symbols',            symbolsRouter);
apiRouter.use('/chart-of-accounts',  coaRouter);
// New modules
apiRouter.use('/branches',           branchesRouter);
apiRouter.use('/wallets',            walletsRouter);
apiRouter.use('/treasury',           treasuryRouter);
apiRouter.use('/documents',          documentsRouter);
apiRouter.use('/crm',                crmRouter);
apiRouter.use('/hr',                 hrRouter);
apiRouter.use('/assets',             assetsRouter);
apiRouter.use('/ownership',          ownershipRouter);
apiRouter.use('/notifications',      notificationsRouter);
apiRouter.use('/workflows',          workflowsRouter);
apiRouter.use('/risk',               riskRouter);
