package edu.iastate.dashboard309.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CommentRequest(
        Long id,
        @NotBlank String commentBody,
        @NotNull @Min(0) @Max(2) Integer status,
        @NotBlank String receiverNetid,
        @NotNull Long teamId,
        String senderNetid,
        LocalDateTime createdAt
) {
}
