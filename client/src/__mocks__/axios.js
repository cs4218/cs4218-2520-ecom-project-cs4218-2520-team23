// CommonJS manual mock for axios (CRA/Jest friendly)
module.exports = {
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => module.exports),
};
