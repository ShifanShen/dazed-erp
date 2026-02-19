package com.example.dazederp.service;

import com.example.dazederp.repo.SaleOrderRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class OrderNoGenerator {
    private final SaleOrderRepository saleOrders;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    public OrderNoGenerator(SaleOrderRepository saleOrders) {
        this.saleOrders = saleOrders;
    }

    public String generate() {
        String datePart = LocalDate.now().format(DATE_FORMATTER);
        String prefix = "SO-" + datePart + "-";
        
        // Find the max sequence number for today
        long maxSeq = saleOrders.findAll().stream()
                .filter(so -> so.getOrderNo() != null && so.getOrderNo().startsWith(prefix))
                .mapToLong(so -> {
                    try {
                        String seqStr = so.getOrderNo().substring(prefix.length());
                        return Long.parseLong(seqStr);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .max()
                .orElse(0L);
        
        long nextSeq = maxSeq + 1;
        return prefix + String.format("%04d", nextSeq);
    }
}
