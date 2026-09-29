const response = {

  //* 200 OK / 201 Created
  success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  },


  //* 200 with pagination
  paginate(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  },


  //* Error — dipanggil dari global error handler
  error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const payload = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
  },
};

module.exports = response;
