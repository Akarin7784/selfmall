package com.selfmall.core;

import java.math.BigDecimal;
public record ProductView(long id, String skuCode, String name, BigDecimal price) {}
