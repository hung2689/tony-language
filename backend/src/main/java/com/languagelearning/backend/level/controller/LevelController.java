package com.languagelearning.backend.level.controller;

import com.languagelearning.backend.level.LevelCalculator;
import com.languagelearning.backend.level.dto.TierDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/levels")
public class LevelController {

    @GetMapping("/tiers")
    public ResponseEntity<List<TierDto>> getTiers() {
        return ResponseEntity.ok(LevelCalculator.TIERS);
    }
}
