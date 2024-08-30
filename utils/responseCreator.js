function responseCreator({
  success = true,
  data = null,
  dataList = null,
  httpStatus = '',
  message = '',
  meta = {},
  errorName = '',
}) {
  const response = {
    data,
    dataList,
    httpStatus: httpStatus || (success ? 'OK' : ''),
    message,
    meta,
    success,
  };
  if (errorName) response.errorName = errorName;
  return response;
}

module.exports = responseCreator;
