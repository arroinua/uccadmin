module.exports = {
    db: process.env.MONGODB || 'mongodb://localhost:27017/uccadmin',
    port: process.env.PORT || 3000,
    secret: process.env.JWT_SECRET || 'BjufyyCt,fcnmzy<f['
};
