package com.selfmall.web;

import com.selfmall.core.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiResponse<Void>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(ApiResponse.error("HTTP_" + e.getStatusCode().value(), e.getReason()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ApiResponse<Void>> invalid(Exception e) {
        return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_ARGUMENT", "请求参数不合法"));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiResponse<Void>> unexpected(Exception e) {
        log.error("Unhandled request failure", e);
        return ResponseEntity.internalServerError().body(ApiResponse.error("INTERNAL_ERROR", "服务暂时不可用"));
    }
}
