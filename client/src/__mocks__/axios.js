// CommonJS manual mock for axios (CRA/Jest friendly)
module.exports = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(() => module.exports),
};
