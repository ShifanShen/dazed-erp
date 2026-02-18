package com.example.dazederp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UserStoreId implements Serializable {
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "store_id")
    private Long storeId;

    public UserStoreId() {
    }

    public UserStoreId(Long userId, Long storeId) {
        this.userId = userId;
        this.storeId = storeId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getStoreId() {
        return storeId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserStoreId that = (UserStoreId) o;
        return Objects.equals(userId, that.userId) && Objects.equals(storeId, that.storeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, storeId);
    }
}

