package com.languagelearning.backend.study.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public class AnswerBatchRequest {

    @NotEmpty(message = "Danh sách câu trả lời không được để trống")
    @Size(max = 100, message = "Mỗi lượt gửi tối đa 100 câu trả lời")
    @Valid
    private List<AnswerItemDto> answers;

    public AnswerBatchRequest() {
    }

    public AnswerBatchRequest(List<AnswerItemDto> answers) {
        this.answers = answers;
    }

    public List<AnswerItemDto> getAnswers() {
        return answers;
    }

    public void setAnswers(List<AnswerItemDto> answers) {
        this.answers = answers;
    }
}
