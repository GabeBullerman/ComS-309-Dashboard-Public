package edu.iastate.dashboard309.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TeamCommentCreateRequest(
        @NotBlank String commentBody,
        @NotNull @Min(0) @Max(2) Integer status,
        @JsonProperty("isPrivate") boolean isPrivate
) {
}
